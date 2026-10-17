"""Public-audio diagnostic: inspect frame results only after inference completes."""
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
model_id, profile, mode = sys.argv[1:]
if model_id not in ('tiny', 'base') or profile not in ('baseline', 'openblas_one') or mode not in ('plain', 'deferred'):
    raise ValueError('Unsupported diagnostic case.')
if profile == 'openblas_one':
    os.environ['OPENBLAS_NUM_THREADS'] = '1'
sys.path.insert(0, str(ROOT / 'server/ml'))
import transcribe as production


def fingerprint(value):
    import numpy as np
    array = np.asarray(value)
    return {'sha256': hashlib.sha256(array.tobytes()).hexdigest(), 'shape': list(array.shape), 'dtype': str(array.dtype), 'strides': list(array.strides), 'alignment64': array.ctypes.data % 64}


def main():
    captured = {'features': [], 'encoders': []}

    def observe(frame, event, result):
        if event != 'return':
            return
        code = frame.f_code
        if code.co_name == '__call__' and code.co_filename.replace('\\', '/').endswith('/faster_whisper/feature_extractor.py'):
            values = frame.f_locals
            captured['features'].append({name: values[name] for name in ('waveform', 'window', 'stft', 'magnitudes', 'mel_spec', 'log_spec') if name in values})
            captured['features'][-1]['mel_filters'] = values['self'].mel_filters
        elif code.co_name == 'encode' and code.co_filename.replace('\\', '/').endswith('/faster_whisper/transcribe.py'):
            captured['encoders'].append({'input': frame.f_locals['features'], 'output': result})
        elif code.co_name == 'decode_bounded' and code.co_filename.replace('\\', '/').endswith('/server/ml/transcribe.py'):
            captured['pcm'] = result

    class BaseModel:
        def transcribe(self, *args, **kwargs):
            from faster_whisper import WhisperModel
            model = WhisperModel(str(ROOT / 'models/speech/whisper-base'), device='cpu', compute_type='int8', cpu_threads=2, num_workers=1, local_files_only=True)
            return model.transcribe(*args, **kwargs)

    payload = sys.stdin.buffer.read(production.MAX_BYTES + 1)
    output = {'model': model_id, 'profile': profile, 'mode': mode, 'inputSha256': hashlib.sha256(payload).hexdigest(), 'environment': {k: v for k, v in os.environ.items() if k.startswith(('CT2_', 'MKL_', 'OMP_', 'OPENBLAS_'))}}
    try:
        if mode == 'deferred':
            sys.setprofile(observe)
        try:
            result = production.transcribe(payload, model=BaseModel() if model_id == 'base' else None)
        finally:
            sys.setprofile(None)
        output.update(status='accepted', result={**result, 'model': 'whisper-' + model_id})
    except production.AudioError as error:
        output.update(status='rejected', errorCode=error.code)
    except Exception as error:
        output.update(status='error', errorType=type(error).__name__)
    if mode == 'deferred':
        try:
            output['stages'] = {'pcm': fingerprint(captured['pcm']), 'features': [{name: fingerprint(array) for name, array in item.items()} for item in captured['features']], 'encoders': [{name: fingerprint(array) for name, array in item.items()} for item in captured['encoders']]}
        except Exception as error:
            output['traceError'] = type(error).__name__
    print(json.dumps(output, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
