"""Deterministic sample representation conversion, with no ASR/model calls."""
import hashlib
import io
import json
from pathlib import Path
import sys
import wave
import av

ROOT=Path(__file__).resolve().parents[1]


def convert(data):
    pieces=[]
    count=0
    with av.open(io.BytesIO(data),mode='r') as source:
        streams=list(source.streams.audio)
        if len(streams)!=1:
            raise ValueError('Unexpected audio stream count.')
        resampler=av.AudioResampler(format='s16',layout='mono',rate=16000)
        def append(frames):
            nonlocal count
            for frame in frames:
                count+=frame.samples
                if count>16000*120:
                    raise ValueError('Source clip exceeds preparation safety bound; retain as error, do not crop.')
                pieces.append(frame.to_ndarray().astype('<i2').tobytes())
        for frame in source.decode(streams[0]):
            append(resampler.resample(frame))
        append(resampler.resample(None))
    output=io.BytesIO()
    with wave.open(output,'wb') as target:
        target.setnchannels(1)
        target.setsampwidth(2)
        target.setframerate(16000)
        target.writeframes(b''.join(pieces))
    return output.getvalue(),count


def main():
    directory=Path(sys.argv[1]).resolve()
    if not directory.is_relative_to((ROOT/'datasets/public/fleurs/processed').resolve()):
        raise ValueError('Unsafe processed directory.')
    selection=json.loads((directory/'selection.json').read_text(encoding='utf-8'))
    output=directory/'audio'
    output.mkdir(exist_ok=True)
    for record in selection['records']:
        name=record['filename']
        if Path(name).name!=name or '/' in name or '\\' in name:
            raise ValueError('Unsafe filename.')
        raw=(directory/'original'/name).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=record['originalSha256']:
            raise ValueError('Original audio checksum mismatch.')
        try:
            converted,count=convert(raw)
            audio_name=name.rsplit('.',1)[0]+'.wav'
            (output/audio_name).write_bytes(converted)
            record.update({'audioPath':'audio/'+audio_name,'audioSha256':hashlib.sha256(converted).hexdigest(),'audioBytes':len(converted),'durationSeconds':count/16000,'preparedSamples':count})
        except Exception:
            record['preparationError']='audio_conversion_failed'
    manifest={**selection,'representation':'PCM s16 mono WAV 16000Hz, no cropping or augmentation','audioConversionSourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    (directory/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Prepared {len(manifest["records"])} retained recordings.',flush=True)


if __name__=='__main__':
    main()
