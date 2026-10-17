// Fixed metric pairs only. A package (papan, karung, botol) needs its own agreed factor.
export function receiptUnits(base) {
  if (base === 'kg' || base === 'gram') return [base, base === 'kg' ? 'gram' : 'kg'];
  if (base === 'liter' || base === 'ml') return [base, base === 'liter' ? 'ml' : 'liter'];
  return [base];
}

export function receiptMeasurement(base, inputUnit, qty, price) {
  if (!receiptUnits(base).includes(inputUnit)) throw new Error('Satuan penerimaan tidak sesuai bahan. Gunakan kg/gram, liter/ml, atau satuan stok yang sama.');
  const inputScaled = Math.round(qty * 10000);
  if (typeof qty !== 'number' || !Number.isFinite(qty) || qty <= 0 || qty > 10000 || Math.abs(qty - inputScaled / 10000) >= 1e-9) throw new Error('Jumlah harus positif, maksimal 10.000 dengan empat angka desimal.');
  if (['butir', 'buah'].includes(base) && !Number.isInteger(qty)) throw new Error(`Jumlah ${base} harus berupa bilangan bulat.`);
  if (!Number.isInteger(price) || price < 0 || price > 10000000) throw new Error('Harga per satuan harus rupiah bulat, 0–10.000.000.');
  let numerator = 1, denominator = 1;
  if (inputUnit !== base) {
    if (inputUnit === 'kg' || inputUnit === 'liter') numerator = 1000;
    else denominator = 1000;
  }
  const scaled = inputScaled * numerator / denominator;
  if (!Number.isInteger(scaled) || scaled < 1) throw new Error(`Jumlah terlalu kecil atau terlalu rinci untuk stok ${base}. Gunakan kelipatan 0,1 ${inputUnit} saat mengubah ke ${base}.`);
  if (scaled > 10000 * 10000) throw new Error(`Hasil konversi maksimal 10.000 ${base}. Kurangi jumlah diterima.`);
  const total = Math.round(inputScaled * price / 10000);
  if (total > 1000000000) throw new Error('Total barang masuk maksimal Rp1 miliar.');
  return { qty: scaled / 10000, scaledQty: scaled, unitPrice: price * denominator / numerator, total, inputQty: inputScaled / 10000, inputUnit, inputUnitPrice: price };
}
