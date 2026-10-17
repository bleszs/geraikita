"""Stage fingerprints on public diagnostic clips, never a business endpoint."""
import hashlib
import json
import os
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
model_id,profile=sys.argv[1:]
if model_id not in ('tiny','base') or profile not in ('baseline','one_thread','seed_zero','avx2_controlled'):
    raise ValueError('Unsupported diagnostic profile/model.')
if profile=='avx2_controlled':
    os.environ.update({'CT2_FORCE_CPU_ISA':'AVX2','MKL_CBWR':'AVX2','OMP_NUM_THREADS':'1','MKL_NUM_THREADS':'1','OPENBLAS_NUM_THREADS':'1','CT2_PACKED_GEMM':'0'})
os.environ['HF_HUB_OFFLINE']='1'
os.environ['HF_HUB_DISABLE_TELEMETRY']='1'
os.environ['TOKENIZERS_PARALLELISM']='false'
os.environ['CT2_VERBOSE']='1'
sys.path.insert(0,str(ROOT/'server/ml'))
from transcribe import AudioError,MAX_BYTES,transcribe
import numpy as np


def fingerprint(value):
    array=np.ascontiguousarray(np.asarray(value))
    return {'sha256':hashlib.sha256(array.tobytes()).hexdigest(),'shape':list(array.shape),'dtype':str(array.dtype)}


def cpu_number():
    try:
        import ctypes
        return ctypes.windll.kernel32.GetCurrentProcessorNumber()
    except Exception:
        return None


def main():
    import ctranslate2
    if profile=='seed_zero':
        ctranslate2.set_random_seed(0)
    trace={'model':model_id,'profile':profile,'cpuStart':cpu_number(),'environment':{k:v for k,v in os.environ.items() if k.startswith(('CT2_','MKL_','OMP_','OPENBLAS_','ONEDNN_'))},'features':[],'encoders':[],'segments':[]}

    class TracedModel:
        def transcribe(self,audio,**kwargs):
            trace['pcm']=fingerprint(audio)
            trace['options']=kwargs
            from faster_whisper import WhisperModel
            threads=1 if profile in ('one_thread','avx2_controlled') else 2
            model=WhisperModel(str(ROOT/f'models/speech/whisper-{model_id}'),device='cpu',compute_type='int8',cpu_threads=threads,num_workers=1,local_files_only=True)
            feature_extractor=model.feature_extractor
            class TracedFeatures:
                def __getattr__(self,name):
                    return getattr(feature_extractor,name)
                def __call__(self,waveform,*args,**kw):
                    trace['vadPcm']=fingerprint(waveform)
                    features=feature_extractor(waveform,*args,**kw)
                    trace['features'].append(fingerprint(features))
                    return features
            model.feature_extractor=TracedFeatures()
            encoder=model.encode
            def encode(features):
                encoded=encoder(features)
                trace['encoders'].append({'input':fingerprint(features),'output':fingerprint(encoded)})
                return encoded
            model.encode=encode
            segments,info=model.transcribe(audio,**kwargs)
            trace['durationAfterVad']=info.duration_after_vad
            def generate():
                for segment in segments:
                    trace['segments'].append({'tokens':segment.tokens,'text':segment.text,'avgLogprob':segment.avg_logprob,'noSpeechProbability':segment.no_speech_prob})
                    yield segment
            return generate(),info
    try:
        payload=sys.stdin.buffer.read(MAX_BYTES+1)
        trace['inputSha256']=hashlib.sha256(payload).hexdigest()
        result=transcribe(payload,model=TracedModel())
        trace['result']={**result,'model':'whisper-'+model_id}
        trace['status']='accepted'
    except AudioError as error:
        trace['status']='rejected'
        trace['errorCode']=error.code
    except Exception as error:
        trace['status']='error'
        trace['errorType']=type(error).__name__
        trace['errorMessage']=str(error)[:300]
    trace['cpuEnd']=cpu_number()
    print(json.dumps(trace,ensure_ascii=True),flush=True)


if __name__=='__main__':
    main()
