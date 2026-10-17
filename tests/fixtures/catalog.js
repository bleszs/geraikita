export const menu = [
  { id: 'ayam', name: 'Ayam geprek', aliases: ['ayam geprek', 'geprek'], price: 18000, recipe: { telur: 1, beras: .15, minyak: .05 } },
  { id: 'nasi', name: 'Nasi goreng', aliases: ['nasi goreng', 'nasgor'], price: 12000, recipe: { telur: 1, beras: .12, minyak: .03 } },
  { id: 'teh', name: 'Es teh', aliases: ['es teh', 'teh manis'], price: 8000, recipe: { gula: .04, gelas: 1 } }
];
export const catalog = [
  { id: 'telur', name: 'Telur ayam', unit: 'butir', stock: 8, min: 15, shelfDays: 2, shelf: '2 hari lagi', target: 30 },
  { id: 'beras', name: 'Beras', unit: 'kg', stock: 2.5, min: 3, shelfDays: 30, shelf: '30 hari lagi', target: 5.5 },
  { id: 'gula', name: 'Gula pasir', unit: 'kg', stock: 1, min: 1.5, shelfDays: 60, shelf: '60 hari lagi', target: 3 },
  { id: 'minyak', name: 'Minyak goreng', unit: 'liter', stock: 3, min: 2, shelfDays: 60, shelf: '60 hari lagi', target: 4 },
  { id: 'gelas', name: 'Gelas kemasan', unit: 'buah', stock: 42, min: 20, shelfDays: null, shelf: 'Tidak mudah rusak', target: 60 }
];
export const example = 'Ayam geprek 3, es teh 2, nasi goreng 1. Ayamnya satu pedas banget tanpa timun, dua sedang. Sambal dipisah.';
export function total(items, menus = menu) { return items.reduce((sum, i) => sum + (i.unitPrice ?? menus.find(p => p.id === i.id).price) * i.qty, 0); }
export function usage(items, menus = menu) {
  const amounts = {};
  for (const item of items) for (const [id, qty] of Object.entries(menus.find(p => p.id === item.id).recipe)) amounts[id] = (amounts[id] || 0) + qty * item.qty;
  return Object.fromEntries(Object.entries(amounts).map(([id, qty]) => [id, Math.round(qty * 10000) / 10000]));
}
