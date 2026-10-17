import { proportional } from './common.mjs';
export function optimize(members, currentBusiness, version, expiresAt, now = Date.now(), configuredQuote = null) {
  const configured=!!configuredQuote;
  const quote=configuredQuote || {supplier:'',unitPrice:null,shipping:0,minimum:null,individualPrice:null,individualShipping:null,productId:null,unit:''};
  const comparison=configured && quote.individualPrice!=null && quote.individualShipping!=null;
  const active = members.filter(m => m.active && m.expiresAt > now);
  const visible = active.length >= 3;
  const participants = active.map(m => {
    const surplus = Math.min(m.qty, m.received || 0);
    return { ...m, surplus, order: m.qty - surplus };
  });
  const shipping = proportional(quote.shipping, participants.map(m => m.order));
  const allocations = participants.map((m, i) => {
    const cost = configured ? m.order * quote.unitPrice + (m.surplusCost || 0) + shipping[i] : null;
    const individual = comparison ? m.qty * quote.individualPrice + quote.individualShipping : null;
    return { businessId: m.businessId, name: m.name, qty: m.qty, surplus: m.surplus, order: m.order,
      transport: shipping[i], cost, individual, savings: comparison ? individual - cost : null, decision: m.approvedVersion === version ? m.decision : 'pending',
      needsReview: !!m.needsReview, budget: m.budget, withinBudget: configured && (!m.budget || cost <= m.budget) };
  });
  const own = allocations.find(m => m.businessId === currentBusiness) || null;
  const order = allocations.reduce((s, m) => s + m.order, 0);
  const conflicts = [];
  if (!visible) conflicts.push('Minimal tiga usaha harus membagikan kebutuhan. Jumlah anggota lain belum ditampilkan.');
  if(!configured)conflicts.push('Pengelola belum menyimpan penawaran pemasok.');
  if (configured && order < quote.minimum) conflicts.push(`Minimum order ${quote.minimum} ${quote.unit} belum tercapai.`);
  if (configured && now >= expiresAt) conflicts.push('Penawaran pemasok kedaluwarsa. Mulai siklus kulakan baru setelah permintaan surplus diselesaikan.');
  if (configured && allocations.some(m => !m.withinBudget)) conflicts.push('Biaya bagian salah satu anggota melebihi anggaran yang disetujui.');
  if (allocations.some(m => m.needsReview)) conflicts.push('Stok berubah setelah kebutuhan dibagikan. Anggota terkait perlu meninjau dan memperbarui kebutuhan sebelum proposal disetujui.');
  const eligible = conflicts.length === 0;
  return { version, visible, count: active.length, collective: visible ? allocations.reduce((s, m) => s + m.qty, 0) : null,
    surplus: visible ? allocations.reduce((s, m) => s + m.surplus, 0) : null, order: visible ? order : null,
    participants: visible ? allocations.map(({ budget, ...allocation }) => allocation) : [], own, quote: { ...quote, configured, expiresAt }, conflicts, eligible,
    ready: eligible && allocations.every(m => m.decision === 'accepted'),
    approvedCount: visible ? allocations.filter(m => m.decision === 'accepted').length : null,
    totalCost: visible && configured ? allocations.reduce((s, m) => s + m.cost, 0) : null };
}
