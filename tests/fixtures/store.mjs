import {createStore as emptyStore} from '../../server/store.mjs';
import {randomUUID,randomBytes} from 'node:crypto';
import {dayAt,addDays,units} from '../../server/common.mjs';
import {catalog,menu,total,usage} from './catalog.js';
export const profiles=[
  { id: 'sari', name: 'Warung Bu Sari', shortName: 'Bu Sari', letter: 'S' },
  { id: 'budi', name: 'Kedai Pak Budi', shortName: 'Pak Budi', letter: 'B' },
  { id: 'rina', name: 'Dapur Bu Rina', shortName: 'Bu Rina', letter: 'R' },
  { id: 'dewi', name: 'Warung Bu Dewi', shortName: 'Bu Dewi', letter: 'D' }
];
export function createStore(filename=':memory:'){const store=emptyStore(filename);const {run,get,all,atomic}=store;
  function seedMenus(workspace, business) {
    run('INSERT OR IGNORE INTO business_state VALUES(?,?,1,0)', workspace, business);
    for (const m of menu) run('INSERT OR IGNORE INTO menus VALUES(?,?,?,?,?,?,?)', workspace, business, m.id, m.name, JSON.stringify(m.aliases), m.price, JSON.stringify(m.recipe));
    for (const p of catalog) run('INSERT OR IGNORE INTO ingredients VALUES(?,?,?,?,?,?,?,?,?)',workspace,business,p.id,p.name,p.name.normalize('NFKC').toLowerCase(),p.unit,units(p.min),p.shelf,p.id==='telur' ? 1 : 0);
  }

  function seed(workspace, now = Date.now()) {
    const today = dayAt(now);
    run('INSERT INTO workspaces(id,version,quote_expires,created_at,active_cycle) VALUES(?,?,?,?,1)', workspace, 1, now + 24 * 60 * 60 * 1000, new Date(now).toISOString());
    run('INSERT INTO collective_cycles VALUES(?,1,?,?,NULL)', workspace, 'planning', new Date(now).toISOString());
    for (const [index, profile] of profiles.entries()) {
      run('INSERT INTO businesses VALUES(?,?,?,?,?)', workspace, profile.id, profile.name, profile.shortName, profile.letter);
      seedMenus(workspace, profile.id);
      for (const p of catalog) run('INSERT INTO inventory VALUES(?,?,?,?,?)', workspace, profile.id, p.id, units(profile.id === 'dewi' && p.id === 'telur' ? 30 : p.stock + (profile.id === 'sari' ? 0 : index * (p.unit === 'butir' ? 2 : .2))), p.shelfDays ? addDays(today, p.shelfDays) : null);
      for (let i = 28; i > 0; i--) {
        const date = addDays(today, -i); const weekday = new Date(date + 'T12:00:00Z').getUTCDay();
        const eggs = 12 + (weekday === 0 || weekday === 6 ? 8 : 0) + index * 2 + ((i * 7) % 3);
        const history = { telur: eggs, beras: eggs * .14, gula: (8 + (i % 4)) * .04, minyak: eggs * .04, gelas: 8 + (i % 4) };
        for (const [product, qty] of Object.entries(history)) run('INSERT INTO daily_usage VALUES(?,?,?,?,?)', workspace, profile.id, product, date, units(qty));
      }
      const items = [{ id: 'ayam', qty: 3 }, { id: 'teh', qty: 6 }, { id: 'nasi', qty: 2 }];
      for (const [product, qty] of Object.entries(usage(items))) run('INSERT INTO daily_usage VALUES(?,?,?,?,?)', workspace, profile.id, product, today, units(qty));
      for (let i = 0; i < items.length; i++) run('INSERT INTO sales(id,workspace_id,business_id,idem,fingerprint,items,total,date,created_at,cancelled_at,usage_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?,?)', `${workspace}-${profile.id}-seed-${i}`, workspace, profile.id, `seed-${i}`, 'seed', JSON.stringify([{ ...items[i], name: menu.find(m => m.id === items[i].id).name, unitPrice: menu.find(m => m.id === items[i].id).price }]), total([items[i]]), today, `${today}T0${3 - i}:00:00Z`, null, JSON.stringify(usage([items[i]])));
      const demand = profile.id === 'budi' ? 18 : profile.id === 'rina' ? 10 : 0;
      run('INSERT INTO demands(workspace_id,business_id,qty,active,budget,expires_at,approved_version,decision,stock_revision) VALUES(?,?,?,?,?,?,?,?,?)', workspace, profile.id, demand, demand ? 1 : 0, null, now + 24 * 60 * 60 * 1000, null, 'pending', 0);
    }
    run('INSERT INTO offers(id,workspace_id,owner_id,product_id,qty,unit_price,expires_at,condition,cycle,created_at) VALUES(?,?,?,?,?,?,?,?,1,?)', randomUUID(), workspace, 'dewi', 'telur', 10, 1000, now + 12 * 60 * 60 * 1000, 'Utuh, disimpan di tempat kering; periksa saat serah terima.', new Date(now).toISOString());
  }

  function session(business = 'sari', workspace = null) {
    return atomic(() => {
      if (!workspace) { workspace = randomUUID(); seed(workspace); }
      if(get('SELECT active_cycle FROM workspaces WHERE id=?',workspace).active_cycle===1 && !get('SELECT quote_json FROM workspaces WHERE id=?',workspace).quote_json)run('UPDATE workspaces SET quote_json=?,settings=? WHERE id=?',JSON.stringify({productName:'Telur ayam',supplier:'UD Pangan Bersama',unitPrice:1200,individualPrice:1500,shipping:6000,individualShipping:5000,minimum:30,productId:'telur',unit:'butir'}),JSON.stringify({product:{id:'telur',name:'Telur ayam',unit:'butir'}}),workspace);
      const value = { id: randomBytes(32).toString('hex'), workspace_id: workspace, business_id: business, csrf: randomBytes(24).toString('hex'), expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000 };
      run('INSERT INTO sessions VALUES(?,?,?,?,?)', value.id, value.workspace_id, value.business_id, value.csrf, value.expires_at);
      return value;
    });
  }

for(const b of all('SELECT workspace_id,id FROM businesses'))seedMenus(b.workspace_id,b.id);
for(const sale of all('SELECT * FROM sales')){const items=JSON.parse(sale.items).map(i=>({...i,name:i.name==='Menu tidak tersedia'?menu.find(m=>m.id===i.id)?.name:i.name,unitPrice:i.unitPrice ?? menu.find(m=>m.id===i.id)?.price}));run('UPDATE sales SET items=? WHERE id=?',JSON.stringify(items),sale.id);}
return {...store,seed,session};}
