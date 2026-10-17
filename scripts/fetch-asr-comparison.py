"""Explicit download of pinned comparison assets; never changes the active model."""
import hashlib
import json
from pathlib import Path
import sys
import urllib.request
ROOT=Path(__file__).resolve().parents[1]


def digest_file(filename):
    digest=hashlib.sha256()
    with filename.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            digest.update(chunk)
    return digest.hexdigest()


def get(url,target,size,expected=None,git_blob=None):
    target.parent.mkdir(parents=True,exist_ok=True)
    def valid(filename):
        if not filename.exists() or filename.stat().st_size!=size:
            return False
        if expected:
            return digest_file(filename)==expected
        data=filename.read_bytes()
        return hashlib.sha1(f'blob {len(data)}\0'.encode()+data).hexdigest()==git_blob
    if valid(target):
        print('Verified existing '+target.name,flush=True)
        return
    temporary=target.with_suffix(target.suffix+'.part')
    count=0
    with urllib.request.urlopen(url,timeout=120) as response,temporary.open('wb') as output:
        while True:
            data=response.read(1024*1024)
            if not data:
                break
            output.write(data)
            count+=len(data)
            if count>size:
                raise ValueError('Download larger than pinned source.')
            if count%(32*1024*1024)==0:
                print(f'{target.name}: {count//1024//1024}/{size//1024//1024} MiB',flush=True)
    if not valid(temporary):
        raise ValueError('Pinned checksum mismatch: '+target.name)
    temporary.replace(target)
    print('Verified '+target.name,flush=True)


def main():
    if sys.argv[1:]==['model']:
        lock=json.loads((ROOT/'models/speech-base-source.json').read_text(encoding='utf-8'))
        target=ROOT/'models/speech/whisper-base'
        manifest={'repository':lock['repository'],'revision':lock['revision'],'license':lock['license'],'files':[]}
        for item in lock['files']:
            url=f'https://huggingface.co/{lock["repository"]}/resolve/{lock["revision"]}/{item["name"]}'
            filename=target/item['name']
            get(url,filename,item['size'],item.get('sha256'),item.get('gitBlobSha1'))
            manifest['files'].append({'name':item['name'],'size':item['size'],'sha256':digest_file(filename)})
        (target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    elif sys.argv[1:]==['validation']:
        protocol=json.loads((ROOT/'benchmarks/asr-comparison/protocol.json').read_text(encoding='utf-8'))
        source=protocol['raw']['validation']
        url=f'https://huggingface.co/datasets/google/fleurs/resolve/{protocol["source"]["parquetRevision"]}/{source["path"]}'
        get(url,ROOT/'datasets/public/fleurs/raw/id_id-validation.parquet',source['bytes'],source['sha256'])
    else:
        raise ValueError('Use model or validation.')


if __name__=='__main__':
    main()
