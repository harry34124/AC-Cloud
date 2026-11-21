// Desktop-only resource/occlusion helpers. Original production objects stay read-only.
export async function loadVehicleLayers(layers,url){
 const result=new Array(layers.length);let next=0;
 await Promise.all(Array.from({length:Math.min(4,layers.length)},async()=>{while(next<layers.length){const i=next++,l=layers[i],response=await fetch(url(l.file));if(!response.ok)throw Error('Vehicle image '+response.status+': '+l.file);const im=await createImageBitmap(await response.blob());result[i]={...l,im};}}));return result;
}
export function createVehicleClear(canvas,width,height){
 const probe=document.createElement('canvas');probe.width=265;probe.height=Math.ceil(height/4);const pc=probe.getContext('2d',{willReadFrequently:true});let time=-Infinity,data=null;
 function clear(rect,clock){
  if(!data||clock<time||clock-time>.12){pc.clearRect(0,0,probe.width,probe.height);pc.drawImage(canvas,0,0,probe.width,probe.height);data=pc.getImageData(0,0,probe.width,probe.height).data;time=clock;}
  if(rect.top<0||rect.bottom>height)return false;
  const sx=probe.width/width,sy=probe.height/height;
  for(let y=Math.max(0,Math.floor((rect.top-2)*sy));y<Math.min(probe.height,Math.ceil((rect.bottom+2)*sy));y++)for(let x=Math.max(0,Math.floor((rect.left-2)*sx));x<Math.min(probe.width,Math.ceil((rect.right+2)*sx));x++)if(data[(y*probe.width+x)*4+3]>16)return false;return true;
 };clear.invalidate=()=>{data=null;time=-Infinity;};clear.resize=(w,h)=>{width=w;height=h;probe.width=Math.min(1024,Math.ceil(w/4));probe.height=Math.ceil(h/4);clear.invalidate();};return clear;
}

// A failed vehicle request may recover once by using the real inward-facing
// native action. No scene relocation, character mirroring or menu/rage event.
export function vehicleSpaceRecovery({id,source,width,registration,size}){
 if(source==='space-recovery'||!['A03','A29','A26','A31','A16'].includes(id))return null;
 if(!Number.isFinite(width)||!Number.isFinite(registration?.x)||!Number.isFinite(size))return null;
 const dx=width/2-registration.x;if(Math.abs(dx)<Math.max(24,size*.25))return null;
 return{id:dx>0?'A29':'A03',source:'space-recovery',requestedAction:id};
}
export function applyVehicleRecoveryPlan(trip,viewport){
 if(viewport.entryContext!=='space-recovery')return trip;
 const {width,registration}=viewport,{size,direction,minAnchor,maxAnchor,vehicleOffsetsCSS:g}=trip,start=registration.x;
 const target=Math.max(minAnchor,Math.min(maxAnchor,width/2)),distance=direction*(target-start);
 const actorFits=start>=size*.32-.5&&start<=width-size*.32+.5;
 // Only the trailing part of the arriving bike may start outside the screen.
 // The front and the fully parked destination must already have real space.
 const frontFits=direction>0?start+g.right<=width-12:start+g.left>=12;
 const fits=actorFits&&minAnchor<=maxAnchor&&frontFits&&distance>=Math.max(24,size*.25);
 return{...trip,fitsAtStart:fits,originalFitsAtStart:trip.fitsAtStart,
  edgeEntry:fits?'space-recovery':null,recoveryTargetX:target,
  distancePx:fits?distance:0,
  message:fits?undefined:'当前屏幕空间放不下安全的骑行路线，请缩小人物或移到更宽的屏幕。'};
}

export function planVehicleTrip({direction=-1,registration,width,size,leftOffset,rightOffset,distancePx,speedPxPerSecond=220}){
 const margin=12,start=registration.x,min=margin-leftOffset,max=width-margin-rightOffset,fitsAtStart=start>=min-.5&&start<=max+.5;
 const available=Math.max(0,direction<0?start-min:max-start);
 const requested=Number.isFinite(distancePx)?Math.max(0,distancePx):Math.min(620,Math.max(180,available*(.28+Math.random()*.35)));
 return{fitsAtStart,minAnchor:min,maxAnchor:max,availableDistancePx:available,distancePx:Math.min(available,requested),speedPxPerSecond,direction,size,vehicleOffsetsCSS:{left:leftOffset,right:rightOffset}};
}

// Keep one conservative side/anchor for the full utterance: a yaw flip must not
// repeatedly invalidate, hide and re-show an already visible dialogue.
export function createStableVehicleDialogue(draw,surface){
 let cached=null,lastElapsed=-Infinity;
 return function stable(ctx,options){
  const {text,elapsed,height=400,readSeconds=2.2,anchor,isClear}=options;
  const end=[...('「'+text+'」')].length*.07+readSeconds+.16;
  if(!text||elapsed<0||elapsed>=end){cached=null;lastElapsed=elapsed;return null;}
  const frame=surface(),s=height<=200?Math.max(.75,.6+height/1000):Math.min(1.15,.8+(height-200)*.35/200),gap=12*s;
  ctx.save();ctx.font=`${16*s}px SimSun,serif`;const width=Math.max(128*s,Math.min(238*s,ctx.measureText('「'+text+'」').width+46*s+[...('「'+text+'」')].length*.5*s)),boxHeight=73*s;ctx.restore();
  const cx=(anchor.left+anchor.right)/2;
  if(!cached||cached.text!==text||elapsed<lastElapsed){
   const candidates=[{left:anchor.right+gap,top:Math.max(8,anchor.top-20*s),side:'right'},{left:anchor.left-width-gap,top:Math.max(8,anchor.top-20*s),side:'left'},{left:cx-width/2,top:Math.max(8,anchor.top-boxHeight-gap),side:'above'}];
   const fits=p=>p.left>=frame.left+8&&p.left+width<=frame.right-8&&p.top+boxHeight<=frame.height-8&&(!isClear||isClear({left:p.left-3,top:p.top-3,right:p.left+width+3,bottom:p.top+boxHeight+3}));
   let p=candidates.find(fits);if(!p)p={left:Math.max(frame.left+8,Math.min(frame.right-width-8,cx-width/2)),top:Math.max(8,anchor.top-boxHeight-gap),side:'above'};
   cached={text,dx:p.left-cx,dy:p.top-anchor.top,side:p.side};
  }
  lastElapsed=elapsed;const position={left:Math.max(frame.left+8,Math.min(frame.right-width-8,cx+cached.dx)),top:Math.max(8,Math.min(frame.height-boxHeight-8,anchor.top+cached.dy))};
  const result=draw(ctx,{...options,stageWidth:frame.width,headAnchor:anchor,anchor:null,isClear,position});return result?{...result,side:cached.side,stable:true}:null;
 };
}
