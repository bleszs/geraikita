"""Reuse the frozen source reader/converter without modifying its historical code."""
import importlib.util
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) != 3 or sys.argv[1] not in ('metadata', 'extract', 'convert'):
    raise ValueError('Use metadata, extract or convert and an output directory.')
spec = importlib.util.spec_from_file_location('frozen_comparison_data', ROOT / 'scripts/asr-comparison-data.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
module.PROTOCOL = json.loads((ROOT / 'benchmarks/asr-profiles/protocol.json').read_text(encoding='utf8'))
module.main()
