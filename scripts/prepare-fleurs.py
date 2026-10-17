"""Stream pinned parquet batches in an isolated data environment; no ASR/SQLite."""
import hashlib
import json
from pathlib import Path
import re
import sys
import pyarrow.parquet as pq

ROOT=Path(__file__).resolve().parents[1]
PROTOCOL=json.loads((ROOT/'benchmarks/fleurs/protocol.json').read_text(encoding='utf-8'))
RAW=ROOT/'datasets/public/fleurs/raw/id_id-test.parquet'


def sha_file(filename):
    digest=hashlib.sha256()
    with filename.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    mode=sys.argv[1]
    directory=Path(sys.argv[2]).resolve()
    if not directory.is_relative_to((ROOT/'datasets/public/fleurs/processed').resolve()):
        raise ValueError('Preparation output must remain in the FLEURS processed directory.')
    if RAW.stat().st_size!=PROTOCOL['raw']['bytes'] or sha_file(RAW)!=PROTOCOL['raw']['sha256']:
        raise ValueError('Pinned raw checksum mismatch before parsing.')
    directory.mkdir(parents=True,exist_ok=True)
    parquet=pq.ParquetFile(RAW,pre_buffer=False)
    if mode=='metadata':
        metadata=[]
        for batch in parquet.iter_batches(batch_size=16,columns=['id','num_samples','audio.path','transcription'],use_threads=False):
            for row in batch.to_pylist():
                audio_path=row['audio']['path']
                filename=audio_path.replace('\\','/').rsplit('/',1)[-1]
                if not re.fullmatch(r'[A-Za-z0-9_-]+\.(wav|flac)',filename,re.IGNORECASE):
                    raise ValueError('Unexpected source filename.')
                metadata.append({'sentenceId':row['id'],'numSamples':row['num_samples'],'filename':filename,'sourceAudioPath':audio_path,'reference':row['transcription']})
        (directory/'source-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f'Inspected metadata of {len(metadata)} publisher test recordings; no predictions.',flush=True)
    elif mode=='extract':
        selection=json.loads((directory/'selection.json').read_text(encoding='utf-8'))
        records=selection['records']
        if len(records)!=PROTOCOL['selection']['count']:
            raise ValueError('Unexpected sample count.')
        output=directory/'original'
        output.mkdir(exist_ok=True)
        by_path={row['sourceAudioPath']:row for row in records}
        extracted=set()
        for batch in parquet.iter_batches(batch_size=1,columns=['audio'],use_threads=False):
            audio=batch.column(0)[0].as_py()
            if audio['path'] not in by_path:
                continue
            record=by_path[audio['path']]
            filename=record['filename']
            if audio['path'] in extracted or not re.fullmatch(r'[A-Za-z0-9_-]+\.(wav|flac)',filename,re.IGNORECASE):
                raise ValueError('Unsafe or duplicate output filename.')
            data=audio['bytes']
            if not isinstance(data,bytes) or len(data)>32*1024*1024:
                raise ValueError('Unexpected source audio payload.')
            record['originalSha256']=hashlib.sha256(data).hexdigest()
            record['originalBytes']=len(data)
            (output/filename).write_bytes(data)
            extracted.add(audio['path'])
        if len(extracted)!=len(records):
            raise ValueError('Missing selected audio; selection is not replaced.')
        (directory/'selection.json').write_text(json.dumps(selection,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f'Extracted {len(records)} original public recordings without changing selection.',flush=True)
    else:
        raise ValueError('Use metadata or extract.')


if __name__=='__main__':
    main()
