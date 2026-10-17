const closed=new Set(['completed','cancelled','discarded']);
export const DEFAULT_AGING_MINUTES=15;
const agingMinutes=c=>Number.isInteger(c?.agingMinutes)&&c.agingMinutes>=1&&c.agingMinutes<=120?c.agingMinutes:DEFAULT_AGING_MINUTES;
const elapsed=(t,now)=>t.phase_started_at?Math.max(0,(now-Date.parse(t.phase_started_at))/60000):0;
const slots=(times,count)=>{const result=[...times].sort((a,b)=>a-b);while(result.length<count)result.unshift(0);return result.slice(-count);};

// minutes is the TOTAL recipe duration; passive_minutes is included in it.
// This is an estimate: cooks still confirm every phase explicitly.
export function estimateWaits(stations,active,passive,queued,now){
  const eta=new Map();
  for(const station of stations){
    const running=active.filter(t=>t.station===station.station).map(t=>({t,remaining:Math.max(0,(t.minutes-t.passive_minutes)*t.qty-elapsed(t,now))})).sort((a,b)=>a.remaining-b.remaining||a.t.id.localeCompare(b.t.id));
    let equipment=[];
    for(const t of passive.filter(t=>t.station===station.station)){const remaining=Math.max(0,t.passive_minutes*t.qty-elapsed(t,now));equipment.push(remaining);eta.set(t.id,remaining);}
    if(station.equipment!==null)equipment=slots(equipment,station.equipment);
    const finish=(t,activeEnd)=>{
      if(!t.passive_minutes){eta.set(t.id,activeEnd);return activeEnd;}
      equipment.sort((a,b)=>a-b);
      const passiveStart=station.equipment===null?activeEnd:Math.max(activeEnd,equipment[0]);
      const end=passiveStart+t.passive_minutes*t.qty;
      if(station.equipment!==null)equipment[0]=end;
      eta.set(t.id,end);
      // A cook remains occupied if the next passive equipment slot is full.
      return passiveStart;
    };
    const occupied=running.map(({t,remaining})=>finish(t,remaining));
    const workers=slots(occupied,station.cooks);
    for(const t of queued.filter(t=>t.station===station.station)){
      workers.sort((a,b)=>a-b);
      workers[0]=finish(t,workers[0]+(t.minutes-t.passive_minutes)*t.qty);
    }
  }
  return eta;
}

export function planKitchen(rows,tasks,settings,capacities,now=Date.now()){
  const byId=new Map(rows.map(o=>[o.id,o]));
  const open=tasks.filter(t=>t.status!=='voided'&&byId.has(t.order_id)&&!closed.has(byId.get(t.order_id).status));
  const agingByStation=new Map(capacities.map(c=>[c.station,agingMinutes(c)]));
  const waiting=open.filter(t=>t.status==='queued').sort((a,b)=>{
    const age=t=>now-Date.parse(byId.get(t.order_id).created_at),late=t=>age(t)>=(agingByStation.get(t.station)??DEFAULT_AGING_MINUTES)*60000,lateA=late(a),lateB=late(b);
    return Number(lateB)-Number(lateA)||(lateA&&lateB?age(b)-age(a):a.minutes*a.qty-b.minutes*b.qty)||a.id.localeCompare(b.id);
  });
  const stations=[...new Set([...settings.map(s=>s.station),...open.map(t=>t.station)])].sort().map(station=>{
    const c=capacities.find(c=>c.station===station);
    return {station,cooks:c?.cooks??1,equipment:c?.equipment??null,agingMinutes:agingMinutes(c),revision:c?.revision??0,active:open.filter(t=>t.station===station&&t.status==='active').length,passive:open.filter(t=>t.station===station&&t.status==='passive').length};
  });
  const next=stations.filter(c=>open.some(t=>t.station===c.station)).map(c=>{const taskIds=waiting.filter(t=>t.station===c.station).slice(0,Math.max(0,c.cooks-c.active)).map(t=>t.id);return {station:c.station,taskId:taskIds[0]||null,taskIds};});
  const taskEtas=estimateWaits(stations,open.filter(t=>t.status==='active'),open.filter(t=>t.status==='passive'),waiting,now);
  const orderEtas=new Map(rows.map(o=>{const pending=open.filter(t=>t.order_id===o.id&&t.status!=='ready');return [o.id,closed.has(o.status)?null:pending.length?Math.ceil(Math.max(...pending.map(t=>taskEtas.get(t.id)??0))):0];}));
  return {stations,next,taskEtas,orderEtas};
}
