"""Download only the pinned Indonesian test shard, not the whole multilingual corpus."""
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
PROTOCOL=json.loads((ROOT/'benchmarks/fleurs/protocol.json').read_text(encoding='utf-8'))


def sha_file(filename):
    digest=hashlib.sha256()
    with filename.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    directory=ROOT/'datasets/public/fleurs/raw'
    directory.mkdir(parents=True,exist_ok=True)
    target=directory/'id_id-test.parquet'
    source=PROTOCOL['raw']
    if target.exists() and target.stat().st_size==source['bytes'] and sha_file(target)==source['sha256']:
        print('Pinned Indonesian test shard already verified.')
        return
    temporary=target.with_suffix('.parquet.part')
    url=f'https://huggingface.co/datasets/google/fleurs/resolve/{PROTOCOL["parquetRevision"]}/{source["path"]}'
    count=0
    with urllib.request.urlopen(url, timeout=120) as response, temporary.open('wb') as output:
        while True:
            chunk=response.read(1024*1024)
            if not chunk:
                break
            output.write(chunk)
            count+=len(chunk)
            if count>source['bytes']:
                raise ValueError('Download exceeds pinned size.')
            if count % (32*1024*1024)==0:
                print(f'Downloaded {count//1024//1024} MiB / {source["bytes"]//1024//1024} MiB',flush=True)
    if count!=source['bytes'] or sha_file(temporary)!=source['sha256']:
        raise ValueError('Pinned source checksum/size mismatch; not parsing.')
    temporary.replace(target)
    print('Verified SHA256 '+source['sha256'],flush=True)


if __name__=='__main__':
    main()
