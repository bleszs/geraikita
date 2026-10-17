import {randomUUID} from 'node:crypto';
import {requireValue} from './common.mjs';
export function createConfiguration(store,{cycles,bump}){
  function saveQuote(s,body){
    const w=store.get('SELECT * FROM workspaces WHERE id=?',s.workspace_id);
    requireValue(w.owner_business_id===s.business_id,'Hanya pengelola kelompok dapat mengubah penawaran.',403);
    requireValue(!cycles.locked(s),'Rencana sudah disepakati. Selesaikan siklus sebelum mengubah penawaran.',409);
    requireValue(typeof body.supplier==='string' && body.supplier.trim().length>=2 && body.supplier.trim().length<=80,'Nama pemasok harus 2–80 karakter.');
    requireValue(typeof body.productName==='string' && body.productName.trim().length>=2 && body.productName.trim().length<=60,'Nama bahan bersama harus 2–60 karakter.');
    requireValue(['kg','gram','liter','ml','butir','buah'].includes(body.unit),'Pilih satuan bahan bersama.');
    for(const key of ['unitPrice','shipping'])requireValue(Number.isInteger(body[key]) && body[key]>=0 && body[key]<=10000000,'Harga dan ongkir harus rupiah bulat 0–10.000.000.');
    requireValue(body.unitPrice>0,'Harga pemasok harus lebih dari nol.');
    requireValue(Number.isInteger(body.minimum) && body.minimum>=1 && body.minimum<=300,'Minimum pembelian harus 1–300 satuan.');
    for(const key of ['individualPrice','individualShipping'])requireValue(body[key]==null || (Number.isInteger(body[key]) && body[key]>=0 && body[key]<=10000000),'Pembanding biaya harus rupiah bulat atau dikosongkan.');
    requireValue((body.individualPrice==null)===(body.individualShipping==null),'Isi kedua biaya pembanding atau kosongkan keduanya.');
    const expiresAt=Date.parse(body.expiresAt);requireValue(Number.isFinite(expiresAt) && expiresAt>Date.now() && expiresAt<=Date.now()+30*86400000,'Batas penawaran harus di masa depan, maksimal 30 hari.');
    return store.atomic(()=>{
      const settings=JSON.parse(w.settings || '{}'),old=settings.product;
      requireValue(!old || (old.name===body.productName.trim() && old.unit===body.unit),'Nama dan satuan bahan bersama tetap setelah dibuat.',409);
      const ownExisting=store.ingredients(s).find(p=>p.name.normalize('NFKC').toLowerCase()===body.productName.trim().normalize('NFKC').toLowerCase());
      requireValue(!ownExisting || ownExisting.unit===body.unit,'Satuan bahan pribadi berbeda. Periksa satuan sebelum memilih bahan bersama.',409);
      const product=old || {id:ownExisting?.id || randomUUID(),name:body.productName.trim(),unit:body.unit};
      if(!old)for(const member of store.all('SELECT id FROM businesses WHERE workspace_id=?',s.workspace_id)){
        const list=store.ingredients({...s,business_id:member.id});
        if(list.some(p=>p.id===product.id)){store.run('UPDATE ingredients SET shared=1 WHERE workspace_id=? AND business_id=? AND id=?',s.workspace_id,member.id,product.id);continue;}
        requireValue(list.length<25,'Salah satu katalog anggota sudah penuh.',409);
        requireValue(!list.some(p=>p.name.normalize('NFKC').toLowerCase()===product.name.normalize('NFKC').toLowerCase()),'Nama bahan bersama sudah dipakai sebagai bahan pribadi. Gunakan nama pembeda yang disepakati.',409);
        store.run('INSERT INTO ingredients VALUES(?,?,?,?,?,?,0,?,1)',s.workspace_id,member.id,product.id,product.name,product.name.normalize('NFKC').toLowerCase(),product.unit,'');
        store.run('INSERT INTO inventory VALUES(?,?,?,?,NULL)',s.workspace_id,member.id,product.id,0);store.run('UPDATE business_state SET catalog_revision=catalog_revision+1 WHERE workspace_id=? AND business_id=?',s.workspace_id,member.id);
      }
      const quote={supplier:body.supplier.trim(),productId:product.id,productName:product.name,unit:product.unit,unitPrice:body.unitPrice,shipping:body.shipping,minimum:body.minimum,individualPrice:body.individualPrice ?? null,individualShipping:body.individualShipping ?? null};
      store.run('UPDATE workspaces SET settings=?,quote_json=?,quote_expires=? WHERE id=?',JSON.stringify({...settings,product}),JSON.stringify(quote),expiresAt,s.workspace_id);bump(s);
      store.log(s.workspace_id,s.business_id,'Penawaran pemasok diperbarui dari rincian yang dimasukkan pengelola; persetujuan perlu ditinjau ulang.');
      return {saved:true};
    });
  }
  return {saveQuote};
}
