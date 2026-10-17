import {AsyncLocalStorage} from 'node:async_hooks';

// Historical actions remain unknown; attribution is captured only for new writes.
export function migrateActivity(db){
  for(const table of ['audit','kitchen_actions']){
    const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));
    for(const [name,type] of [['actor_id','TEXT'],['actor_name','TEXT'],['actor_role','TEXT'],['actor_revision','INTEGER']]){
      if(!columns.has(name))db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
    }
  }
}

export function createActivity({get}){
  const context=new AsyncLocalStorage();
  function resolve(s){
    if(!s?.workspace_id||!s?.business_id)return null;
    const id=s.account_id||get('SELECT account_id FROM account_sessions WHERE session_id=?',s.id||'')?.account_id;
    if(!id)return null;
    const row=get('SELECT r.account_id AS id,r.name,r.role,r.revision FROM account_roles r JOIN accounts a ON a.id=r.account_id AND a.workspace_id=r.workspace_id AND a.business_id=r.business_id WHERE r.account_id=? AND r.workspace_id=? AND r.business_id=? AND r.disabled_at IS NULL',id,s.workspace_id,s.business_id);
    return row?{...row,workspaceId:s.workspace_id,businessId:s.business_id}:null;
  }
  const run=(s,fn)=>context.run(resolve(s),fn);
  const current=(workspace,business)=>{const a=context.getStore();return a?.workspaceId===workspace&&a.businessId===business?a:null;};
  const wrap=object=>Object.fromEntries(Object.entries(object).map(([key,value])=>[key,typeof value==='function'?function(s,...args){return run(s,()=>value(s,...args));}:value]));
  return {resolve,run,current,wrap};
}
