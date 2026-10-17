export {total,usage} from './catalog.js';
export const money=n=>n==null?'Belum tersedia':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n);
export const number=n=>n==null?'—':new Intl.NumberFormat('id-ID',{maximumFractionDigits:4}).format(n);
