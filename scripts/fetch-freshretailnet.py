"""Download a pinned public dataset and prepare an ID-selected benchmark.

Only DuckDB (requirements-ml.txt) is needed. No training, user database access,
imputation, synthetic fallback, or evaluation-dependent selection occurs here.
"""
import csv
import hashlib
import json
import math
import os
from pathlib import Path
import urllib.request
import datetime
import duckdb

ROOT = Path(__file__).resolve().parents[1]
PROTOCOL = json.loads((ROOT / 'benchmarks/freshretailnet/protocol.json').read_text())
BASE = ROOT / 'datasets/public/freshretailnet'
RAW = BASE / 'raw'
PROCESSED = BASE / 'processed'
RAW.mkdir(parents=True, exist_ok=True)
PROCESSED.mkdir(parents=True, exist_ok=True)
REVISION = PROTOCOL['revision']
REMOTE = 'https://huggingface.co/datasets/Dingdong-Inc/FreshRetailNet-50K/resolve/' + REVISION + '/'

def checksum(filename):
    h = hashlib.sha256()
    with filename.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

for name, metadata in PROTOCOL['files'].items():
    destination = RAW / name
    if not destination.exists():
        print('Downloading ' + name, flush=True)
        partial = RAW / (name + '.part')
        with urllib.request.urlopen(REMOTE + 'data/' + name, timeout=60) as response, partial.open('wb') as out:
            while chunk := response.read(1024 * 1024):
                out.write(chunk)
        if checksum(partial) != metadata['sha256'] or partial.stat().st_size != metadata['bytes']:
            raise ValueError('Downloaded checksum/size mismatch: ' + name)
        os.replace(partial, destination)
    if checksum(destination) != metadata['sha256']:
        raise ValueError('Existing input checksum mismatch: ' + name)
    print('Verified ' + name, flush=True)

card = RAW / 'SOURCE_README.md'
if not card.exists():
    card.write_bytes(urllib.request.urlopen(REMOTE + 'README.md', timeout=60).read())
db = duckdb.connect()
db.execute("SET threads=2")
columns = 'city_id,store_id,product_id,dt,sale_amount,stock_hour6_22_cnt'
db.read_parquet(str(RAW / 'train.parquet')).project(columns).create_view('training')
db.read_parquet(str(RAW / 'eval.parquet')).project(columns).create_view('evaluation')
keys = db.execute('SELECT DISTINCT city_id,store_id,product_id FROM training').fetchall()
def key_text(key):
    return ':'.join(map(str, key))
selected = sorted(keys, key=lambda k: hashlib.sha256((PROTOCOL['protocolVersion'] + ':' + key_text(k)).encode()).hexdigest())[:PROTOCOL['sample']['series']]
db.execute('CREATE TEMP TABLE selected(city_id BIGINT,store_id BIGINT,product_id BIGINT)')
db.executemany('INSERT INTO selected VALUES(?,?,?)', selected)
groups = {k: {'train': [], 'eval': []} for k in selected}
for split, view in [('train', 'training'), ('eval', 'evaluation')]:
    records = db.execute(f'SELECT d.* FROM {view} d JOIN selected s USING(city_id,store_id,product_id) ORDER BY city_id,store_id,product_id,dt').fetchall()
    for city, store, product, date, sale, stockout in records:
        if not math.isfinite(sale) or sale < 0:
            raise ValueError('Invalid observed sales in ' + key_text((city, store, product)))
        groups[(city, store, product)][split].append({'date': str(date), 'quantity': sale, 'stockoutHours': stockout})

index = []
for key in selected:
    city, store, product = key
    training = groups[key]['train']
    evaluation = groups[key]['eval']
    if len(training) != 90 or len(evaluation) != 7:
        raise ValueError('Unexpected row counts, not replacing selected series: ' + key_text(key))
    combined = training + evaluation
    for i, row in enumerate(combined):
        date = datetime.date.fromisoformat(row['date'])
        if i and date != datetime.date.fromisoformat(combined[i-1]['date']) + datetime.timedelta(days=1):
            raise ValueError('Duplicate or missing date, no imputation: ' + key_text(key))
    scope = {'workspaceId': 'public-freshretailnet', 'businessId': f'city-{city}-store-{store}', 'productId': f'product-{product}', 'unit': 'normalized_sales'}
    dataset = {'schemaVersion': 1, 'scope': scope, 'provenance': {
        'source': 'public_dataset', 'reference': 'Dingdong-Inc FreshRetailNet-50K v1.0, CC BY 4.0; pinned revision ' + REVISION,
        'permissionConfirmed': True, 'completeDailyRecords': True, 'usage': 'benchmark_only',
        'sourceUrl': PROTOCOL['sourceUrl'], 'license': PROTOCOL['license'], 'sourceRevision': REVISION,
        'rawSha256': PROTOCOL['files']['train.parquet']['sha256'],
        'targetDescription': PROTOCOL['target'], 'missingDatePolicy': 'Reject gaps; no imputation.'
    }, 'observations': [{'date': r['date'], 'quantity': r['quantity']} for r in training]}
    filename = f'city-{city}-store-{store}-product-{product}.json'
    (PROCESSED / filename).write_text(json.dumps(dataset, indent=2) + '\n', encoding='utf-8')
    index.append({'file': filename, 'key': list(key), 'scope': scope, 'trainStockouts': training, 'externalObservations': evaluation})

manifest = {'protocol': PROTOCOL, 'downloadedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'rawCardSha256': checksum(card), 'totalTrainRows': db.execute('SELECT COUNT(*) FROM training').fetchone()[0],
            'totalEvalRows': db.execute('SELECT COUNT(*) FROM evaluation').fetchone()[0], 'availableSeries': len(keys),
            'selectedSeries': len(index), 'series': index}
(PROCESSED / 'index.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k: manifest[k] for k in ['totalTrainRows', 'totalEvalRows', 'availableSeries', 'selectedSeries']}), flush=True)
