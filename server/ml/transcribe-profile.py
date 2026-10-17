"""Explicit candidate profiles; the default application worker is unchanged."""
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
PROFILES = {'tiny-current': ('tiny', None), 'tiny-pinned': ('tiny', '1'), 'base-pinned': ('base', '1')}


def main():
    try:
        if len(sys.argv) not in (2, 3) or sys.argv[1] not in PROFILES or (len(sys.argv) == 3 and sys.argv[2] != '--check'):
            raise ValueError('Unsupported speech profile.')
        profile = sys.argv[1]
        model_id, threads = PROFILES[profile]
        if threads is not None:
            os.environ['OPENBLAS_NUM_THREADS'] = threads
        # Native libraries must not be imported before the profile is configured.
        import transcribe as production

        class BaseModel:
            def transcribe(self, *args, **kwargs):
                from faster_whisper import WhisperModel
                model = WhisperModel(str(ROOT / 'models/speech/whisper-base'), device='cpu', compute_type='int8', cpu_threads=2, num_workers=1, local_files_only=True)
                return model.transcribe(*args, **kwargs)

        if sys.argv[2:] == ['--check']:
            if model_id == 'tiny':
                production.load_model()
            else:
                from faster_whisper import WhisperModel
                WhisperModel(str(ROOT / 'models/speech/whisper-base'), device='cpu', compute_type='int8', cpu_threads=2, num_workers=1, local_files_only=True)
            result = {'ready': True, 'compute': 'cpu-int8'}
        else:
            result = production.transcribe(sys.stdin.buffer.read(production.MAX_BYTES + 1), model=BaseModel() if model_id == 'base' else None)
        result.update(model='whisper-' + model_id, profile=profile, openblasThreads=os.environ.get('OPENBLAS_NUM_THREADS'), pretrained=True)
        print(json.dumps(result, ensure_ascii=True), flush=True)
    except Exception as error:
        code = getattr(error, 'code', 'engine_unavailable')
        print(json.dumps({'error': code}), flush=True)
        sys.exit(2 if code != 'engine_unavailable' else 3)


if __name__ == '__main__':
    main()
