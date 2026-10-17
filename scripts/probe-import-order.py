"""Narrow import-order intervention; production transcription stays unchanged."""
import hashlib
import json
import os
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server/ml'))
import transcribe as production
model_id,order=sys.argv[1:]
if model_id not in ('tiny','base') or order not in ('production','ct2_first','numpy_first','numpy_then_ct2','av_then_ct2'):
    raise ValueError('Unsupported diagnostic case.')
if order=='ct2_first':
    import ctranslate2
elif order=='numpy_first':
    import numpy
elif order=='numpy_then_ct2':
    import numpy
    import ctranslate2
elif order=='av_then_ct2':
    import av
    import ctranslate2


class LocalModel:
    def transcribe(self,*args,**kwargs):
        from faster_whisper import WhisperModel
        model=WhisperModel(str(ROOT/f'models/speech/whisper-{model_id}'),device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,local_files_only=True)
        return model.transcribe(*args,**kwargs)


def main():
    audio=sys.stdin.buffer.read(production.MAX_BYTES+1)
    output={'model':model_id,'order':order,'audioSha256':hashlib.sha256(audio).hexdigest()}
    try:
        output['result']=production.transcribe(audio,model=LocalModel())
        output['status']='accepted'
    except production.AudioError as error:
        output.update(status='rejected',error=error.code)
    except Exception as error:
        output.update(status='error',error=type(error).__name__)
    print(json.dumps(output,ensure_ascii=True),flush=True)


if __name__=='__main__':
    main()
