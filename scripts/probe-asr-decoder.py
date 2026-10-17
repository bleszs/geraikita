"""Bounded diagnostic on pinned public audio; never an application worker."""
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def fingerprint(value):
    import numpy as np
    array = np.asarray(value)
    return {"sha256": hashlib.sha256(array.tobytes()).hexdigest(), "shape": list(array.shape),
            "dtype": str(array.dtype), "alignment64": array.ctypes.data % 64}


def generation_value(result):
    return {"tokens": [list(tokens) for tokens in result.sequences_ids],
            "scores": [float(score) for score in result.scores], "noSpeechProbability": float(result.no_speech_prob)}


def decoder_kwargs(values):
    options = values["options"]
    if tuple(options.temperatures) != (0.0,):
        raise ValueError("Replay requires the frozen temperature-zero decoder.")
    return {"length_penalty": options.length_penalty, "repetition_penalty": options.repetition_penalty,
            "no_repeat_ngram_size": options.no_repeat_ngram_size, "max_length": values["max_length"],
            "return_scores": True, "return_no_speech_prob": True, "suppress_blank": options.suppress_blank,
            "suppress_tokens": list(options.suppress_tokens), "max_initial_timestamp_index": values["max_initial_timestamp_index"],
            **values["kwargs"]}


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in ("baseline", "openblas_one") or sys.argv[2] not in ("plain", "deferred") or sys.argv[3] != "3":
        raise ValueError("Expected baseline|openblas_one plain|deferred 3.")
    profile, mode, replay_count = sys.argv[1], sys.argv[2], int(sys.argv[3])
    if profile == "openblas_one":
        os.environ["OPENBLAS_NUM_THREADS"] = "1"
    sys.path.insert(0, str(ROOT / "server/ml"))
    import transcribe as production
    payload = sys.stdin.buffer.read(production.MAX_BYTES + 1)
    captured = {"features": [], "encoders": [], "decoders": [], "segments": []}

    def observe(frame, event, result):
        if event != "return":
            return
        filename = frame.f_code.co_filename.replace("\\", "/")
        name = frame.f_code.co_name
        values = frame.f_locals
        if name == "decode_bounded" and filename.endswith("/server/ml/transcribe.py"):
            captured["pcm"] = result
        elif name == "__call__" and filename.endswith("/faster_whisper/feature_extractor.py"):
            captured["features"].append({**{key: values[key] for key in ("waveform", "window", "stft", "magnitudes", "mel_spec", "log_spec") if key in values},
                                         "mel_filters": values["self"].mel_filters})
        elif filename.endswith("/faster_whisper/transcribe.py"):
            if name == "encode":
                captured["encoders"].append({"input": values["features"], "output": result})
            elif name == "generate_with_fallback" and result is not None:
                # Retain references only; hashing/replay happen after complete transcription.
                captured["decoders"].append({"values": {key: values[key] for key in ("self", "encoder_output", "prompt", "options", "max_length", "max_initial_timestamp_index", "kwargs")},
                                             "result": result})
            elif name == "generate_segments" and result is not None and hasattr(result, "tokens"):
                captured["segments"].append(result)

    class BaseModel:
        def transcribe(self, *args, **kwargs):
            from faster_whisper import WhisperModel
            model = WhisperModel(str(ROOT / "models/speech/whisper-base"), device="cpu", compute_type="int8", cpu_threads=2,
                                 num_workers=1, local_files_only=True)
            return model.transcribe(*args, **kwargs)

    output = {"profile": profile, "mode": mode, "inputSha256": hashlib.sha256(payload).hexdigest(),
              "environment": {key: value for key, value in os.environ.items() if key.startswith(("CT2_", "MKL_", "OMP_", "OPENBLAS_"))}}
    try:
        if mode == "deferred":
            sys.setprofile(observe)
        try:
            result = production.transcribe(payload, model=BaseModel())
        finally:
            sys.setprofile(None)
        output.update(status="accepted", result={**result, "model": "whisper-base"})
    except production.AudioError as error:
        output.update(status="rejected", errorCode=error.code)
    except Exception as error:
        output.update(status="error", errorType=type(error).__name__)

    if mode == "deferred" and output["status"] == "accepted":
        try:
            decoders = []
            for item in captured["decoders"]:
                values = item["values"]
                options = decoder_kwargs(values)
                decoders.append({"input": fingerprint(values["encoder_output"]), "prompt": list(values["prompt"]), "kwargs": options,
                                 "output": generation_value(item["result"][0]), "averageLogProbability": float(item["result"][1]),
                                 "temperature": float(item["result"][2]), "compressionRatio": float(item["result"][3])})
            output["stages"] = {"pcm": fingerprint(captured["pcm"]),
                                "features": [{key: fingerprint(value) for key, value in item.items()} for item in captured["features"]],
                                "encoders": [{key: fingerprint(value) for key, value in item.items()} for item in captured["encoders"]],
                                "decoders": decoders,
                                "segments": [{"tokens": list(segment.tokens), "text": segment.text, "start": segment.start, "end": segment.end,
                                              "averageLogProbability": segment.avg_logprob, "noSpeechProbability": segment.no_speech_prob}
                                             for segment in captured["segments"]]}
            output["replays"] = []
            # Same retained encoder buffer/prompt/options, original model instance, profiling off.
            # Post-inference process/model state is not assumed identical to the initial call.
            for index, item in enumerate(captured["decoders"]):
                values = item["values"]
                for repeat in range(1, replay_count + 1):
                    row = {"decoder": index, "repeat": repeat, "inputBefore": fingerprint(values["encoder_output"])}
                    try:
                        result = values["self"].model.generate(values["encoder_output"], [list(values["prompt"])], **decoders[index]["kwargs"])[0]
                        row.update(status="accepted", output=generation_value(result))
                    except Exception as error:
                        row.update(status="error", errorType=type(error).__name__)
                    row["inputAfter"] = fingerprint(values["encoder_output"])
                    output["replays"].append(row)
        except Exception as error:
            output["traceError"] = type(error).__name__
    print(json.dumps(output, ensure_ascii=True, allow_nan=False), flush=True)


if __name__ == "__main__":
    main()
