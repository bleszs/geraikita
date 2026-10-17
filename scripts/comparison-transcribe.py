"""Research runner: exact shared production decoder/gates, explicit pinned model."""
import json
import os
from pathlib import Path
import sys
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'server/ml'))
from transcribe import AudioError,MAX_BYTES,transcribe


def load_local(model_id):
    from faster_whisper import WhisperModel
    return WhisperModel(str(ROOT/f'models/speech/whisper-{model_id}'),device='cpu',compute_type='int8',cpu_threads=2,num_workers=1,local_files_only=True)


class LazyLocalModel:
    def __init__(self,model_id):
        self.model_id=model_id

    def transcribe(self,*args,**kwargs):
        # Shared transcribe() has already decoded and checked the audio here.
        # This preserves decode-once and load-after-validation production order.
        return load_local(self.model_id).transcribe(*args,**kwargs)


def main():
    try:
        if len(sys.argv)<2 or sys.argv[1] not in ('tiny','base') or sys.argv[2:] not in ([],['--check']):
            raise ValueError('Unsupported comparison model.')
        model_id=sys.argv[1]
        if sys.argv[2:]==['--check']:
            data=None
        else:
            data=sys.stdin.buffer.read(MAX_BYTES+1)
        if data is None:
            load_local(model_id)
            result={'ready':True,'model':'whisper-'+model_id,'compute':'cpu-int8'}
        else:
            result=transcribe(data,model=LazyLocalModel(model_id))
            result['model']='whisper-'+model_id
        print(json.dumps(result,ensure_ascii=True),flush=True)
    except AudioError as error:
        print(json.dumps({'error':error.code}),flush=True)
        sys.exit(2)
    except Exception:
        print(json.dumps({'error':'engine_unavailable'}),flush=True)
        sys.exit(3)


if __name__=='__main__':
    main()
