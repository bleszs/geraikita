import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createStore} from '../server/store.mjs';
import {createIdentity} from '../server/identity.mjs';
import {RECOVERY_CODE_COUNT} from '../server/account-recovery.mjs';
const credentials=()=>({email:randomUUID()+'@example.test',password:'RecoveryTesting2026!',businessName:'Usaha pulih',communityName:'Kelompok pulih'});
function fixture(t){const store=createStore(':memory:');t.after(()=>store.close());const identity=createIdentity(store),owner=identity.register(credentials());return {store,identity,owner};}
const emailOf=(store,s)=>store.get('SELECT email FROM accounts WHERE id=?',s.account_id).email;

test('owner generates one-time recovery codes stored only as hashes and resets the password with one',t=>{
 const {store,identity,owner}=fixture(t);
 assert.equal(identity.details(owner).recoveryCodes,0);
 const {codes,remaining}=identity.generateRecoveryCodes(owner,{confirmed:true});
 assert.equal(remaining,RECOVERY_CODE_COUNT);assert.equal(codes.length,RECOVERY_CODE_COUNT);assert.equal(new Set(codes).size,RECOVERY_CODE_COUNT);
 for(const c of codes)assert.match(c,/^[A-HJ-NP-Z2-9]{10}$/);
 assert.equal(identity.details(owner).recoveryCodes,RECOVERY_CODE_COUNT);
 const raw=store.all('SELECT * FROM account_recovery_codes');
 for(const r of raw)assert.match(r.code_hash,/^[a-f0-9]{64}$/);
 const dump=JSON.stringify(raw)+JSON.stringify(store.all('SELECT * FROM audit'));
 for(const c of codes)assert.equal(dump.includes(c),false);
 const email=emailOf(store,owner),spaced=codes[0].slice(0,5)+' '+codes[0].slice(5).toLowerCase();
 const {session,remaining:left}=identity.recover({email,code:spaced,newPassword:'BrandNewPass2026!'});
 assert.equal(session.role,'owner');assert.equal(session.business_id,owner.business_id);assert.equal(left,RECOVERY_CODE_COUNT-1);
 assert.equal(identity.resolve(owner.id),undefined);
 assert.equal(identity.login({email,password:'BrandNewPass2026!'}).role,'owner');
 assert.throws(()=>identity.login({email,password:'RecoveryTesting2026!'}),/tidak sesuai/);
 assert.throws(()=>identity.recover({email,code:codes[0],newPassword:'AnotherNewPass2026!'}),/tidak sesuai/);
});

test('regenerating replaces the previous batch; confirmation is required and code-only staff have none',t=>{
 const {store,identity,owner}=fixture(t);
 assert.throws(()=>identity.generateRecoveryCodes(owner,{}),/Konfirmasi/);
 const first=identity.generateRecoveryCodes(owner,{confirmed:true}).codes;
 const second=identity.generateRecoveryCodes(owner,{confirmed:true}).codes;
 assert.equal(store.get('SELECT COUNT(*) AS n FROM account_recovery_codes').n,RECOVERY_CODE_COUNT);
 identity.createStaffInvite(owner,{name:'Kasir',role:'cashier',code:'ABCD2345',confirmed:true,idempotencyKey:randomUUID()});
 const staff=identity.loginStaffCode({code:'ABCD2345'});
 assert.equal(identity.details(staff).recoveryCodes,null);
 assert.throws(()=>identity.generateRecoveryCodes(staff,{confirmed:true}),/pemilik|kode masuk/);
 const email=emailOf(store,owner);
 assert.throws(()=>identity.recover({email,code:first[0],newPassword:'ReplacedBatch2026!'}),/tidak sesuai/);
 assert.equal(identity.recover({email,code:second[0],newPassword:'ReplacedBatch2026!'}).session.role,'owner');
});

test('recovery rejects a wrong email or code with one generic message, enforces password length and consumes nothing on failure',t=>{
 const {store,identity,owner}=fixture(t);
 const {codes}=identity.generateRecoveryCodes(owner,{confirmed:true});
 const email=emailOf(store,owner);
 assert.throws(()=>identity.recover({email:'nobody@example.test',code:codes[0],newPassword:'ValidPassword2026!'}),/tidak sesuai/);
 assert.throws(()=>identity.recover({email,code:'ZZZZZZZZZZ',newPassword:'ValidPassword2026!'}),/tidak sesuai/);
 assert.throws(()=>identity.recover({email,code:'bad',newPassword:'ValidPassword2026!'}),/tidak sesuai/);
 assert.throws(()=>identity.recover({email,code:codes[0],newPassword:'short'}),/10–128/);
 assert.equal(identity.details(owner).recoveryCodes,RECOVERY_CODE_COUNT);
});
