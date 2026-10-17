"""Controlled buffer alignment sweep on one already-seen public clip."""
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
profile = sys.argv[1]
if profile not in ('baseline', 'openblas_one'):
    raise ValueError('Unsupported alignment profile.')
if profile == 'openblas_one':
    os.environ['OPENBLAS_NUM_THREADS'] = '1'
sys.path.insert(0, str(ROOT / 'server/ml'))
import transcribe as production


def main():
    captured = {}

    def observe(frame, event, result):
        if event == 'return' and frame.f_code.co_name == '__call__' and frame.f_code.co_filename.replace('\\', '/').endswith('/faster_whisper/feature_extractor.py'):
            captured.update(frame.f_locals)

    payload = sys.stdin.buffer.read(production.MAX_BYTES + 1)
    output = {'profile': profile, 'inputSha256': hashlib.sha256(payload).hexdigest()}
    try:
        sys.setprofile(observe)
        try:
            output['result'] = production.transcribe(payload)
        finally:
            sys.setprofile(None)
        import numpy as np

        def digest(array):
            return hashlib.sha256(array.tobytes()).hexdigest()

        def shifted(array, alignment):
            # Preserve values, dtype, shape and contiguous order; vary only buffer offset.
            backing = np.empty(array.nbytes + 128, dtype=np.uint8)
            offset = (-backing.ctypes.data) % 64 + alignment
            value = np.ndarray(array.shape, dtype=array.dtype, buffer=backing, offset=offset, order='F' if array.flags.f_contiguous else 'C')
            value[...] = array
            assert value.ctypes.data % 64 == alignment
            assert digest(value) == digest(array)
            return value

        def compare(stage, result, expected, **settings):
            return {'stage': stage, **settings, 'outputSha256': digest(result), 'referenceSha256': digest(expected), 'unequalValues': int(np.count_nonzero(result != expected)), 'maxAbsoluteDifference': float(np.max(np.abs(result - expected))), 'finite': bool(np.isfinite(result).all())}

        rows = []
        for alignment in range(0, 64, 8):
            source = shifted(captured['stft'], alignment)
            result = np.abs(source[..., :-1]) ** 2
            rows.append(compare('magnitudes', result, captured['magnitudes'], alignment=alignment, inputSha256=digest(source)))
        filters = captured['self'].mel_filters
        for left in range(0, 64, 16):
            for right in range(0, 64, 16):
                a, b = shifted(filters, left), shifted(captured['magnitudes'], right)
                result = a @ b
                rows.append(compare('mel_spec', result, captured['mel_spec'], filterAlignment=left, magnitudeAlignment=right, filterSha256=digest(a), magnitudeSha256=digest(b)))
        clipped = np.clip(captured['mel_spec'], a_min=1e-10, a_max=None)
        for alignment in range(0, 64, 16):
            source = shifted(clipped, alignment)
            log_spec = np.log10(source)
            result = (np.maximum(log_spec, log_spec.max() - 8.0) + 4.0) / 4.0
            rows.append(compare('log_spec', result, captured['log_spec'], alignment=alignment, inputSha256=digest(source)))
        output.update(status='accepted', rows=rows, capture={name: {'sha256': digest(captured[name]), 'shape': list(captured[name].shape), 'strides': list(captured[name].strides), 'alignment64': captured[name].ctypes.data % 64} for name in ('stft', 'magnitudes', 'mel_spec', 'log_spec')})
    except Exception as error:
        output.update(status='error', errorType=type(error).__name__)
    print(json.dumps(output, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
