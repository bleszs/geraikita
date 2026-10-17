"""One bounded, offline CPU inference. Audio stays in memory; stdout is JSON only."""
import io
import json
import os
from pathlib import Path
import sys

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"
ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 1_048_576
RATE = 16000
MAX_SECONDS = 30


class AudioError(Exception):
    def __init__(self, code):
        self.code = code


def decode_bounded(data):
    import av
    import numpy as np
    if not data or len(data) > MAX_BYTES:
        raise AudioError("invalid_audio")
    pieces, count = [], 0
    try:
        with av.open(io.BytesIO(data), mode="r") as container:
            streams = list(container.streams.audio)
            if len(streams) != 1:
                raise AudioError("invalid_audio")
            resampler = av.AudioResampler(format="s16", layout="mono", rate=RATE)
            def collect(frames):
                nonlocal count
                for frame in frames:
                    samples = frame.to_ndarray().reshape(-1)
                    count += len(samples)
                    if count > RATE * MAX_SECONDS:
                        raise AudioError("too_long")
                    pieces.append(samples)
            for frame in container.decode(streams[0]):
                collect(resampler.resample(frame))
            collect(resampler.resample(None))
    except AudioError:
        raise
    except Exception as error:
        raise AudioError("invalid_audio") from error
    if count < RATE // 4:
        raise AudioError("too_short")
    audio = np.concatenate(pieces).astype(np.float32) / 32768.0
    if not np.isfinite(audio).all():
        raise AudioError("invalid_audio")
    if float(np.sqrt(np.mean(audio ** 2))) < 0.002:
        raise AudioError("no_speech")
    return audio


def load_model():
    from faster_whisper import WhisperModel
    return WhisperModel(str(ROOT / "models/speech/whisper-tiny"), device="cpu", compute_type="int8", cpu_threads=2, num_workers=1, local_files_only=True)


def transcribe(data, model=None):
    audio = decode_bounded(data)
    model = model or load_model()
    segments, _ = model.transcribe(audio, language="id", task="transcribe", beam_size=3, temperature=0,
        condition_on_previous_text=False, vad_filter=True, vad_parameters={"min_silence_duration_ms": 400},
        no_speech_threshold=0.6, log_prob_threshold=-1.0, compression_ratio_threshold=2.4)
    text = " ".join(s.text.strip() for s in segments if s.no_speech_prob < 0.6 and s.avg_logprob >= -1.0).strip()
    if not text:
        raise AudioError("no_speech")
    if len(text) > 2000:
        raise AudioError("too_much_text")
    return {"text": text, "durationSeconds": round(len(audio) / RATE, 3), "language": "id", "model": "whisper-tiny", "pretrained": True}


def main():
    try:
        if sys.argv[1:] == ["--check"]:
            load_model()
            import importlib.metadata as metadata
            result = {"ready": True, "engine": metadata.version("faster-whisper"), "compute": "cpu-int8", "model": "whisper-tiny"}
        else:
            result = transcribe(sys.stdin.buffer.read(MAX_BYTES + 1))
        print(json.dumps(result, ensure_ascii=True), flush=True)
    except AudioError as error:
        print(json.dumps({"error": error.code}), flush=True)
        sys.exit(2)
    except Exception:
        # No audio, transcript, user identity or raw exception in logs.
        print(json.dumps({"error": "engine_unavailable"}), flush=True)
        sys.exit(3)


if __name__ == "__main__":
    main()
