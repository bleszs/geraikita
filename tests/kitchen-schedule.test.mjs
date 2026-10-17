import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateWaits,planKitchen} from '../server/kitchen-schedule.mjs';
const now=Date.parse('2026-10-17T10:00:00Z');
const station=(cooks=1,equipment=null)=>({station:'dapur',cooks,equipment});
const task=(id,minutes=10,passive=4,extra={})=>({id,order_id:id,station:'dapur',qty:1,minutes,passive_minutes:passive,status:'queued',...extra});
test('recipe total already includes passive time, while the cook becomes free at passive start',()=>{
 const values=estimateWaits([station() ],[],[],[task('a'),task('b')],now);
 assert.equal(values.get('a'),10);assert.equal(values.get('b'),16);
});
test('a cook waiting for passive equipment cannot start another queued item',()=>{
 const values=estimateWaits([station(1,1)],[],[],[task('a',10,9),task('b',2,1),task('c',2,1)],now);
 assert.deepEqual([...values.values()],[10,11,12]);
});
test('lowering staffing capacity below current work waits for excess running jobs to finish',()=>{
 const active=[task('a',3,0,{status:'active'}),task('b',5,0,{status:'active'})];
 const values=estimateWaits([station(1)],active,[],[task('c',2,0)],now);
 assert.equal(values.get('c'),7);
});
test('phase elapsed time and passive capacity reductions stay nonnegative',()=>{
 const passive=[task('a',6,2,{status:'passive',phase_started_at:new Date(now-60000).toISOString()}),task('b',8,4,{status:'passive',phase_started_at:new Date(now-60000).toISOString()})];
 const active=[task('c',4,2,{status:'active',phase_started_at:new Date(now-100*60000).toISOString()})];
 const values=estimateWaits([station(1,1)],active,passive,[],now);
 assert.deepEqual([...values.entries()],[['a',1],['b',3],['c',5]]);
});
test('stations run independently; ready/voided/closed work adds no waiting time',()=>{
 const rows=[{id:'a',status:'queued',created_at:new Date(now).toISOString()},{id:'b',status:'queued',created_at:new Date(now).toISOString()},{id:'c',status:'ready',created_at:new Date(now).toISOString()},{id:'d',status:'completed',created_at:new Date(now).toISOString()}];
 const tasks=[task('a'),task('b',3,0,{station:'minuman'}),task('v',100,90,{order_id:'a',status:'voided'}),task('c',10,0,{status:'ready'}),task('d',99,0,{status:'completed'})];
 const plan=planKitchen(rows,tasks,[],[],now);
 assert.deepEqual([...plan.orderEtas.values()],[10,3,0,null]);assert.equal(plan.taskEtas.has('v'),false);assert.equal(plan.taskEtas.has('d'),false);
});
test('aging priority is shared with estimates and honors explicit multiple cook slots',()=>{
 const rows=[{id:'old',status:'queued',created_at:new Date(now-16*60000).toISOString()},{id:'short',status:'queued',created_at:new Date(now).toISOString()},{id:'last',status:'queued',created_at:new Date(now).toISOString()}];
 const tasks=[task('old',10,0),task('short',2,0),task('last',3,0)];
 const plan=planKitchen(rows,tasks,[],[station(2)],now);
 assert.deepEqual(plan.next[0].taskIds,['old','short']);assert.equal(plan.orderEtas.get('last'),5);
});

test('a configurable waiting limit changes the next task and its ETA exactly at the boundary',()=>{
 const rows=[{id:'old',status:'queued',created_at:new Date(now-5*60000).toISOString()},{id:'short',status:'queued',created_at:new Date(now).toISOString()}],tasks=[task('old',10,0),task('short',2,0)];
 const early=planKitchen(rows,tasks,[],[{...station(),agingMinutes:5}],now-1);
 assert.equal(early.next[0].taskId,'short');assert.equal(early.orderEtas.get('old'),12);
 const at=planKitchen(rows,tasks,[],[{...station(),agingMinutes:5}],now);
 assert.equal(at.next[0].taskId,'old');assert.equal(at.orderEtas.get('old'),10);assert.equal(at.orderEtas.get('short'),12);
 const delayed=planKitchen(rows,tasks,[],[{...station(),agingMinutes:30}],now);
 assert.equal(delayed.next[0].taskId,'short');
});

test('each station uses its own waiting limit and overdue tasks remain oldest-first',()=>{
 const rows=[['old',8],['older',10],['short',0],['drink-old',8],['drink-short',0]].map(([id,age])=>({id,status:'queued',created_at:new Date(now-age*60000).toISOString()}));
 const tasks=[task('old',10,0),task('older',12,0),task('short',1,0),task('drink-old',8,0,{station:'minuman'}),task('drink-short',1,0,{station:'minuman'})];
 const p=planKitchen(rows,tasks,[],[{...station(),agingMinutes:5},{station:'minuman',cooks:1,equipment:null,agingMinutes:30}],now);
 assert.equal(p.next.find(s=>s.station==='dapur').taskId,'older');assert.equal(p.next.find(s=>s.station==='minuman').taskId,'drink-short');
 assert.equal(p.orderEtas.get('old'),22);assert.equal(p.orderEtas.get('short'),23);
});

test('changing the waiting limit never interrupts active tasks or exceeds cook capacity',()=>{
 const rows=['running','old','short'].map((id,i)=>({id,status:i?'queued':'preparing',created_at:new Date(now-10*60000).toISOString()}));
 const tasks=[task('running',6,0,{status:'active',phase_started_at:new Date(now).toISOString()}),task('old',10,0),task('short',1,0)];
 const p=planKitchen(rows,tasks,[],[{...station(),agingMinutes:1}],now);
 assert.deepEqual(p.next[0].taskIds,[]);assert.equal(p.taskEtas.get('running'),6);assert.equal(p.orderEtas.get('old'),16);
});
