// CPU-only bounds of the actual already-updated head meshes. No update(), render() or readback.
export function nativeHeadBounds(models){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const model of models){
  const im=model?.internalModel,core=im?.coreModel,m=core?._model;if(!m)continue;
  const d=m.drawables,c=m.canvasinfo,ppu=c.PixelsPerUnit;
  for(let i=0;i<d.ids.length;i++){
   const part=d.ids[i].replace(/^ArtMesh/i,'');
   if(!/^(?:BackHair|FrontHair|Hair|Ears?|Eye|Irides|Face|Nose|Mouth|Head)/i.test(part)||d.opacities[i]<=.001)continue;
   const v=d.vertexPositions[i];
   for(let j=0;j<v.length;j+=2){
    const x=model.x+(v[j]*ppu+c.CanvasOriginX)*model.scale.x;
    const y=model.y+(c.CanvasOriginY-v[j+1]*ppu)*model.scale.y;
    if(!Number.isFinite(x)||!Number.isFinite(y))continue;
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
  }
 }
 return Number.isFinite(left)&&right>left?{left,right,top,bottom}:null;
}
export function transformBounds(a,zoom,pivot,shake){
 if(!a)return null;
 return {left:pivot[0]+(a.left-pivot[0])*zoom+shake[0],right:pivot[0]+(a.right-pivot[0])*zoom+shake[0],top:pivot[1]+(a.top-pivot[1])*zoom+shake[1],bottom:pivot[1]+(a.bottom-pivot[1])*zoom+shake[1]};
}
export function unionBounds(rects){const a=rects.filter(Boolean);return a.length?{left:Math.min(...a.map(r=>r.left)),right:Math.max(...a.map(r=>r.right)),top:Math.min(...a.map(r=>r.top)),bottom:Math.max(...a.map(r=>r.bottom))}:null;}
export const avoids=(a,b)=>!b||a.right<b.left||a.left>b.right||a.bottom<b.top||a.top>b.bottom;
