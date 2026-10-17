import {findTopic,GUIDE_VERSION,PAGE_TOPICS} from './guide-content.js';
export const guideKey=scope=>'gerai-kita-guide-v'+GUIDE_VERSION+':'+scope;
export const emptyGuideProgress=()=>({version:GUIDE_VERSION,welcomeSeen:false,status:'new',topicId:null,step:0,autoPageGuides:false,seenPages:[]});
export function validateGuideProgress(value){
  if(!value||value.version!==GUIDE_VERSION||typeof value.welcomeSeen!=='boolean'||typeof value.autoPageGuides!=='boolean'||!Array.isArray(value.seenPages)||!['new','in_progress','paused','skipped','completed'].includes(value.status))return emptyGuideProgress();
  const topic=findTopic(value.topicId);
  if(value.status!=='new'&&(!topic||!Number.isInteger(value.step)||value.step<0||value.step>=topic.steps.length))return emptyGuideProgress();
  const seenPages=[...new Set(value.seenPages.filter(page=>typeof page==='string'&&page!=='panduan'&&PAGE_TOPICS[page]))];
  return {version:GUIDE_VERSION,welcomeSeen:value.welcomeSeen,status:value.status,topicId:topic?.id||null,step:topic?value.step:0,autoPageGuides:value.autoPageGuides,seenPages};
}
export function readGuideProgress(storage,scope){
  try{return {progress:validateGuideProgress(JSON.parse(storage().getItem(guideKey(scope)))),available:true};}
  catch{return {progress:emptyGuideProgress(),available:false};}
}
export function writeGuideProgress(storage,scope,progress){
  try{storage().setItem(guideKey(scope),JSON.stringify(validateGuideProgress(progress)));return true;}
  catch{return false;}
}
