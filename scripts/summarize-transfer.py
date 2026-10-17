"""Descriptive error analysis after the frozen test; never fit a model."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    pointer = json.loads((ROOT / 'models/benchmarks/boosting-transfer/latest.json').read_text())
    directory = ROOT / pointer['directory']
    report = json.loads((directory / 'report.json').read_text())
    records = json.loads((directory / 'predictions.json').read_text())
    groups = json.loads((directory / 'target-records.json').read_text())
    per_country = report['external']['perCountry']
    errors = []
    table = []
    for country, scores in per_country.items():
        cases = [r for r in records if r['key'] == country]
        actual = sum(r['actual'] for r in cases)
        predicted = sum(r['boosting'] for r in cases)
        zero_days = sum(row['rawQuantity'] == 0 for row in groups[country][334:])
        errors.append({'country': country, 'targetUnits': actual, 'predictedUnits': predicted,
                       'predictionToActualRatio': predicted/actual if actual else None, 'emptyEventDaysOf38': zero_days,
                       'boostingWape': scores['boosting']['wape'], 'ma7Wape': scores['ma7']['wape'], 'ma14Wape': scores['ma14']['wape']})
        table.append(f"| {country} | {100*scores['boosting']['wape']:.2f}% | {100*scores['ma7']['wape']:.2f}% | {100*scores['ma14']['wape']:.2f}% | {zero_days}/38 |")
    worst = sorted(records, key=lambda r: abs(r['actual']-r['boosting']), reverse=True)[:10]
    zero_targets = [r for r in records if r['actual'] == 0]
    analysis = {'runId': report['runId'], 'perCountry': errors,
                'zeroTargetTwoDayCases': len(zero_targets),
                'boostingAbsoluteErrorOnZeroTargets': sum(r['boosting'] for r in zero_targets),
                'ma7AbsoluteErrorOnZeroTargets': sum(r['ma7'] for r in zero_targets), 'worstRawTargets': worst,
                'purpose': 'Descriptive only. Selection, parameters and learned artifact remain unchanged after test.'}
    (ROOT / 'docs/evaluation/boosting-transfer-error-analysis.json').write_text(json.dumps(analysis, indent=2)+'\n', encoding='utf-8')
    primary = report['external']['primaryMacroCountry']
    summary = f'''# Analisis kegagalan transfer boosting sales-only

Run `{report['runId']}`. Metrik utama, rata-rata WAPE negara, adalah {100*primary['boosting']['meanCountryWape']:.2f}% untuk model dibanding {100*primary['ma7']['meanCountryWape']:.2f}% untuk MA7 dan {100*primary['ma14']['meanCountryWape']:.2f}% untuk MA14. Tidak mengklaim transfer berhasil; model menang terhadap MA7 hanya pada {report['external']['countriesBeatingMA7']}/{len(groups)} negara.

| Negara | Model WAPE | MA7 WAPE | MA14 WAPE | Tanggal tanpa event terpublikasi |
|---|---:|---:|---:|---:|
{chr(10).join(table)}

Ada {len(zero_targets)} target dua hari dengan total event nol. Pada kasus tersebut, jumlah galat absolut model {analysis['boostingAbsoluteErrorOnZeroTargets']:.3f} unit, MA7 {analysis['ma7AbsoluteErrorOnZeroTargets']:.3f} unit. Ini observasi error pada publikasi invoice; belum membuktikan penyebab kausal kegagalan atau permintaan sebenarnya. Sumber FreshRetailNet adalah seri produk segar per toko, target UCI agregat negara dari peritel hadiah/grosir; skala fitur yang kompatibel belum menjamin pola permintaannya sesuai.

WAPE = jumlah galat absolut dibagi jumlah aktual, sehingga nilai di atas 100% valid secara matematis. Ini bukan akurasi klasifikasi atau angka yang boleh diubah menjadi akurasi negatif. Ringkasan per negara, volume/prediksi dan sepuluh galat absolut terbesar disimpan di [JSON](boosting-transfer-error-analysis.json). Semua negara dan kasus tetap disertakan.

Tidak ada training atau penyetelan ulang setelah melihat test. Model publik tidak diaktifkan untuk pengguna. Perbaikan berikutnya harus memakai data validasi/adaptasi berizin dan test baru; 190 target ini kini hanya menjadi bukti pengembangan/error analysis bila dipakai lagi.

[Hasil lengkap](BOOSTING_TRANSFER_RESULTS.md), [protokol](../../benchmarks/boosting-transfer/protocol.json), [bukti reproduksi](boosting-transfer-reproducibility.json).
'''
    (ROOT / 'docs/evaluation/BOOSTING_TRANSFER_ERROR_ANALYSIS.md').write_text(summary, encoding='utf-8')
    print({'countriesAnalyzed': len(groups), 'twoDayZeroTargets': len(zero_targets), 'artifactModified': False})


if __name__ == '__main__':
    main()
