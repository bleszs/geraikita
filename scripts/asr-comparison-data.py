"""Pinned validation/test preparation; stream batches, no inference or SQLite."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import sys
ROOT=Path(__file__).resolve().parents[1]
PROTOCOL=json.loads((ROOT/'benchmarks/asr-comparison/protocol.json').read_text(encoding='utf-8'))


def sha_file(filename):
    digest=hashlib.sha256()
    with filename.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    mode=sys.argv[1]
    directory=Path(sys.argv[2]).resolve()
    if not directory.is_relative_to((ROOT/'datasets/public/fleurs/comparison').resolve()):
        raise ValueError('Unsafe preparation output.')
    directory.mkdir(parents=True,exist_ok=True)
    if mode in ('metadata','extract'):
        import pyarrow.parquet as pq
        for split in ('validation','test'):
            raw=ROOT/f'datasets/public/fleurs/raw/id_id-{split}.parquet'
            spec=PROTOCOL['raw'][split]
            if raw.stat().st_size!=spec['bytes'] or sha_file(raw)!=spec['sha256']:
                raise ValueError('Source checksum mismatch before parsing: '+split)
            reader=pq.ParquetFile(raw,pre_buffer=False)
            if mode=='metadata':
                rows=[]
                for batch in reader.iter_batches(batch_size=16,columns=['id','num_samples','audio.path','transcription'],use_threads=False):
                    for row in batch.to_pylist():
                        source_path=row['audio']['path']
                        filename=source_path.replace('\\','/').rsplit('/',1)[-1]
                        if not re.fullmatch(r'[A-Za-z0-9_-]+\.(wav|flac)',filename,re.IGNORECASE):
                            raise ValueError('Unexpected source filename.')
                        rows.append({'sentenceId':row['id'],'numSamples':row['num_samples'],'filename':filename,'sourceAudioPath':source_path,'reference':row['transcription']})
                (directory/f'{split}-metadata.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
                print(f'{split}: inspected {len(rows)} source records without predictions.',flush=True)
            else:
                selection=json.loads((directory/'selection.json').read_text(encoding='utf-8'))
                chosen=selection['splits'][split]['records']
                by_path={r['sourceAudioPath']:r for r in chosen}
                output=directory/split/'original'
                output.mkdir(parents=True,exist_ok=True)
                found=set()
                for batch in reader.iter_batches(batch_size=1,columns=['audio'],use_threads=False):
                    audio=batch.column(0)[0].as_py()
                    if audio['path'] not in by_path:
                        continue
                    row=by_path[audio['path']]
                    if audio['path'] in found or Path(row['filename']).name!=row['filename']:
                        raise ValueError('Unsafe/duplicate chosen recording.')
                    payload=audio['bytes']
                    if not isinstance(payload,bytes) or len(payload)>32*1024*1024:
                        raise ValueError('Unexpected audio payload.')
                    (output/row['filename']).write_bytes(payload)
                    row['originalSha256']=hashlib.sha256(payload).hexdigest()
                    found.add(audio['path'])
                if len(found)!=len(chosen):
                    raise ValueError('Missing selected recording, no replacement.')
                (directory/'selection.json').write_text(json.dumps(selection,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
                print(f'{split}: extracted {len(found)} unchanged selected recordings.',flush=True)
    elif mode=='convert':
        spec=importlib.util.spec_from_file_location('frozen_converter',ROOT/'scripts/prepare-fleurs-audio.py')
        converter=importlib.util.module_from_spec(spec)
        spec.loader.exec_module(converter)
        selection=json.loads((directory/'selection.json').read_text(encoding='utf-8'))
        hashes=set()
        for split in ('validation','test'):
            output=directory/split/'audio'
            output.mkdir(parents=True,exist_ok=True)
            for row in selection['splits'][split]['records']:
                source=(directory/split/'original'/row['filename']).read_bytes()
                if hashlib.sha256(source).hexdigest()!=row['originalSha256']:
                    raise ValueError('Selected original checksum mismatch.')
                try:
                    audio,samples=converter.convert(source)
                except Exception:
                    row['preparationError']='audio_conversion_failed'
                    continue
                digest=hashlib.sha256(audio).hexdigest()
                if digest in hashes:
                    raise ValueError('Duplicate audio across selected groups. Do not replace it.')
                hashes.add(digest)
                filename=Path(row['filename']).stem+'.wav'
                (output/filename).write_bytes(audio)
                row.update({'audioPath':f'{split}/audio/{filename}','audioSha256':digest,'audioBytes':len(audio),'durationSeconds':samples/16000})
        (directory/'manifest.json').write_text(json.dumps(selection,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print('Prepared all chosen recordings with no crop or augmentation.',flush=True)
    else:
        raise ValueError('Use metadata, extract or convert.')


if __name__=='__main__':
    main()
