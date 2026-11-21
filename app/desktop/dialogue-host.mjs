// Desktop-only placement. The supplied source renderer still owns text, scale and timing.
let probe,probeContext;
const finiteRect=a=>a&&['left','right','top'].every(k=>Number.isFinite(a[k]))&&a.right>=a.left;
export function planDesktopDialogue(box,options,v){
 const size=Number(v.size??options.height)||200;
 const w=box.right-box.left,h=box.bottom-box.top;
 const L=Math.max(8,8-v.x),R=Math.min(v.localWidth-8,v.width-v.x-8);
 const T=Math.max(8,8-v.y),B=Math.min(v.localHeight-8,v.height-v.y-8);
 // Callers with locked placement retain their actual moving head separately.
 // Legacy callers retain their source anchor; never infer a moving actor from the screen centre.
 const a=[options.headAnchor,options.anchor,v.headAnchor,v.anchor].find(finiteRect);
 if(!a)return {position:{left:Math.max(L,Math.min(R-w,box.left)),top:Math.max(T,Math.min(B-h,box.top))},source:'unanchored',gap:null};
 const source=a===options.headAnchor?'source-head':a===options.anchor?'source-anchor':a===v.headAnchor?'viewport-head':'viewport-fallback';
 // Font size has an intentional readability floor. Character-to-box spacing must not share it.
 const gap=Math.max(3,Math.min(12,size*.03)),top=a.top;
 const right={left:a.right+gap,top,side:'right'},left={left:a.left-w-gap,top,side:'left'};
 const sides=box.side==='left'?[left,right]:[right,left];
 const candidates=[...sides,{left:(a.left+a.right-w)/2,top:a.top-h-gap,side:'above'}];
 // Small head-relative vertical alternatives, not the old fixed 96px search at every size.
 for(const dy of [-size*.06,-size*.12,-size*.18,-size*.24,size*.12])for(const p of [...sides,candidates[2]])candidates.push({...p,top:p.top+dy});
 const clear=p=>!options.isClear||options.isClear({left:p.left-3,top:p.top-3,right:p.left+w+3,bottom:p.top+h+3});
 const inside=p=>p.left>=L&&p.left+w<=R&&p.top>=T&&p.top+h<=B;
 let p=candidates.find(q=>inside(q)&&clear(q));
 // Clamp the near-head candidates before giving up: the old clamp used the distant source box.
 if(!p)p=candidates.map(q=>({...q,left:Math.max(L,Math.min(R-w,q.left)),top:Math.max(T,Math.min(B-h,q.top))})).find(q=>inside(q)&&clear(q));
 return {position:p??null,source,gap,anchor:{...a},available:{left:L,right:R,top:T,bottom:B}};
}
export function drawDesktopDialogue(draw,ctx,options,viewport=window.desktopViewport){
 window.desktopDialogueBox=null;window.desktopDialoguePlacement=null;
 if(window.desktopWords===false)return null;
 const v=viewport;
 if(!v)return window.desktopDialogueBox=draw(ctx,options);
 if(!probe){probe=document.createElement('canvas');probe.width=probe.height=1;probeContext=probe.getContext('2d',{willReadFrequently:true});}
 // Measure without the source's potentially stale locked anchor or collision search.
 const box=draw(probeContext,{...options,anchor:null,isClear:null,position:{left:0,top:0}});
 if(!box)return null;
 const plan=planDesktopDialogue(box,options,v);window.desktopDialoguePlacement=plan;
 if(!plan.position)return null;
 const result=draw(ctx,{...options,anchor:null,isClear:null,position:plan.position});
 return window.desktopDialogueBox=result?{...result,side:plan.position.side??result.side}:null;
}
