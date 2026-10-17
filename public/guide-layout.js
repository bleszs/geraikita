const clamp=(value,min,max)=>Math.max(min,Math.min(value,Math.max(min,max)));

// Viewport geometry only: no DOM, navigation or application data.
export function guideLayout(target,panel,viewport){
  const {width,height}=viewport,margin=12,gap=38,padding=viewport.focusPadding??6;
  const top=viewport.topInset??12,bottom=height-(viewport.bottomInset??12);
  const panelWidth=Math.min(panel.width,width-2*margin);
  const center=()=>({x:(width-panelWidth)/2,y:top,width:panelWidth,maxHeight:Math.max(100,bottom-top),side:'none',focus:null,arrow:null});
  if(!target||target.right<=margin||target.left>=width-margin||target.bottom<=margin||target.top>=height-margin)return center();
  const left=clamp(target.left-padding,margin,width-margin),right=clamp(target.right+padding,margin,width-margin);
  const y1=clamp(target.top-padding,margin,height-margin),y2=clamp(target.bottom+padding,margin,height-margin);
  if(right<=left||y2<=y1)return center();
  const focus={left,top:y1,right,bottom:y2,width:right-left,height:y2-y1};
  const midX=(left+right)/2,midY=(y1+y2)/2;
  const desiredHeight=Math.min(panel.height,bottom-top);
  let x,y,maxHeight,side;
  if(width-right-gap-margin>=panelWidth){
    side='right';x=right+gap;maxHeight=bottom-top;y=clamp(midY-desiredHeight/2,top,bottom-desiredHeight);
  }else if(left-gap-margin>=panelWidth){
    side='left';x=left-gap-panelWidth;maxHeight=bottom-top;y=clamp(midY-desiredHeight/2,top,bottom-desiredHeight);
  }else{
    const below=bottom-y2-gap,above=y1-top-gap;
    side=below>=above?'bottom':'top';maxHeight=Math.max(100,side==='bottom'?below:above);
    const actualHeight=Math.min(panel.height,maxHeight);
    x=clamp(midX-panelWidth/2,margin,width-panelWidth-margin);
    y=side==='bottom'?y2+gap:y1-gap-actualHeight;
    // Very small viewports: keep exits visible rather than pointing at a covered target.
    if(maxHeight<150||y<top||y+actualHeight>bottom)return center();
  }
  const actualHeight=Math.min(panel.height,maxHeight);
  const end=side==='right'?{x:right,y:midY}:side==='left'?{x:left,y:midY}:side==='bottom'?{x:midX,y:y2}:{x:midX,y:y1};
  const start=side==='right'?{x,y:clamp(midY,y+24,y+actualHeight-24)}:side==='left'?{x:x+panelWidth,y:clamp(midY,y+24,y+actualHeight-24)}:side==='bottom'?{x:clamp(midX,x+24,x+panelWidth-24),y}:{x:clamp(midX,x+24,x+panelWidth-24),y:y+actualHeight};
  const bend=side==='right'||side==='left'?{x:(start.x+end.x)/2,y:Math.max(8,(start.y+end.y)/2-18)}:{x:Math.min(width-8,(start.x+end.x)/2+18),y:(start.y+end.y)/2};
  const d=`M ${start.x} ${start.y} Q ${bend.x} ${bend.y} ${end.x} ${end.y}`;
  return {x,y,width:panelWidth,maxHeight,side,focus,arrow:{start,end,d}};
}
