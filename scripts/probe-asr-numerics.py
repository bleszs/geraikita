"""Single-factor cold-process probes; production import order is preserved."""
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
model_id, profile = sys.argv[1:]
if model_id not in ('tiny', 'base') or profile not in ('baseline', 'openblas_one', 'unpacked_gemm'):
    raise ValueError('Unsupported diagnostic profile/model.')
if profile == 'openblas_one':
    os.environ['OPENBLAS_NUM_THREADS'] = '1'
if profile == 'unpacked_gemm':
    os.environ['CT2_PACKED_GEMM'] = '0'
sys.path.insert(0, str(ROOT / 'server/ml'))
from transcribe import AudioError, MAX_BYTES, transcribe


def fingerprint(value):
    import numpy as np
    array = np.ascontiguousarray(np.asarray(value))
    return {'sha256': hashlib.sha256(array.tobytes()).hexdigest(), 'shape': list(array.shape), 'dtype': str(array.dtype)}


def main():
    trace = {'model': model_id, 'profile': profile, 'environment': {k: v for k, v in os.environ.items() if k.startswith(('CT2_', 'MKL_', 'OMP_', 'OPENBLAS_'))}, 'features': [], 'encoders': [], 'segments': []}

    class TracedModel:
        def transcribe(self, audio, **kwargs):
            trace['pcm'] = fingerprint(audio)
            from faster_whisper import WhisperModel
            model = WhisperModel(str(ROOT / f'models/speech/whisper-{model_id}'), device='cpu', compute_type='int8', cpu_threads=2, num_workers=1, local_files_only=True)
            extractor = model.feature_extractor

            class Features:
                def __getattr__(self, name):
                    return getattr(extractor, name)

                def __call__(self, waveform, *args, **options):
                    trace['vadPcm'] = fingerprint(waveform)
                    trace['melFilters'] = fingerprint(extractor.mel_filters)
                    result = extractor(waveform, *args, **options)
                    trace['features'].append(fingerprint(result))
                    return result

            model.feature_extractor = Features()
            original_encode = model.encode

            def encode(features):
                result = original_encode(features)
                trace['encoders'].append({'input': fingerprint(features), 'output': fingerprint(result)})
                return result

            model.encode = encode
            segments, info = model.transcribe(audio, **kwargs)

            def generate():
                for segment in segments:
                    trace['segments'].append({'tokens': segment.tokens, 'text': segment.text, 'avgLogprob': segment.avg_logprob})
                    yield segment

            return generate(), info

    payload = sys.stdin.buffer.read(MAX_BYTES + 1)
    trace['inputSha256'] = hashlib.sha256(payload).hexdigest()
    try:
        trace['result'] = {**transcribe(payload, model=TracedModel()), 'model': 'whisper-' + model_id}
        trace['status'] = 'accepted'
    except AudioError as error:
        trace.update(status='rejected', errorCode=error.code)
    except Exception as error:
        trace.update(status='error', errorType=type(error).__name__, errorMessage=str(error)[:300])
    print(json.dumps(trace, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
