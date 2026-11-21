import {createBatchedReadback} from "/desktop/generated/batched-readback-w15.mjs";
import {compactMorph,compactPolish} from "/desktop/generated/compact-material-w15.mjs";
import {createMaterialMorph,polishJoint} from "/desktop/generated/glove-material-w14.mjs";
// A local native arm-material morph: one silhouette per skin part, no two-arm fade.
export function createSkinReturn({PIXI,app,back,body,arm,glove,left,target,opacity}){
 const X=210,Y=180,W=145,H=310,N=W*H;
 const targets=Array.from({length:4},()=>PIXI.RenderTexture.create({width:620,height:520}));const batch=createBatchedReadback(PIXI,app,new PIXI.Rectangle(X,Y,W,H),1,4);
 const outputs=Array.from({length:2},()=>{const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const context=canvas.getContext('2d'),data=context.createImageData(W,H),texture=PIXI.Texture.from(canvas),sprite=new PIXI.Sprite(texture);sprite.position.set(X,Y);sprite.visible=false;app.stage.addChild(sprite);return{canvas,context,data,texture,sprite};});
 app.stage.setChildIndex(outputs[0].sprite,app.stage.getChildIndex(body.model));app.stage.setChildIndex(outputs[1].sprite,app.stage.getChildIndex(left.model));
 let coverage=null,processingBounds=null;
 function include(p){const c=p.ci;for(let i=0;i<p.d.ids.length;i++)if(p.d.opacities[i]>.000001){const v=p.d.vertexPositions[i];for(let k=0;k<v.length;k+=2){const x=p.model.x+(v[k]*c.PixelsPerUnit+c.CanvasOriginX)*p.model.scale.x,y=p.model.y+(c.CanvasOriginY-v[k+1]*c.PixelsPerUnit)*p.model.scale.y;if(!coverage)coverage={left:x,right:x,top:y,bottom:y};else{coverage.left=Math.min(coverage.left,x);coverage.right=Math.max(coverage.right,x);coverage.top=Math.min(coverage.top,y);coverage.bottom=Math.max(coverage.bottom,y);}}}}
 function renderModel(p,rt,clear){include(p);const visible=p.model.visible;p.model.visible=true;app.renderer.render(p.model,{renderTexture:rt,clear});p.model.visible=visible;}
 const morph=compactMorph(createMaterialMorph,W,H,1,()=>processingBounds);
 const upper=new Set(['ArtMeshLayerR5','ArtMeshLayerR2']),lower=new Set(['ArtMeshLayerR7','ArtMeshLayerR4','ArtMeshHandwearR2']);
 function targetGroup(group,rt){const saved=Float32Array.from(target.d.opacities);for(let i=0;i<target.d.ids.length;i++)if(!group.has(target.d.ids[i]))opacity(target,i,0);renderModel(target,rt,true);target.d.opacities.set(saved);for(let i=0;i<saved.length;i++)target.d.dynamicFlags[i]|=6;}
 function apply(t){coverage=null;for(const o of outputs)o.sprite.visible=false;if(t<=7.62||t>=8)return;
  const z=(t-7.62)/.38,q=z*z*z*(10+z*(-15+6*z));
  renderModel(back,targets[0],true);targetGroup(upper,targets[1]);
  renderModel(arm,targets[2],true);renderModel(glove,targets[2],false);targetGroup(lower,targets[3]);
  processingBounds=coverage?{left:coverage.left-X-3,right:coverage.right-X+3,top:coverage.top-Y-3,bottom:coverage.bottom-Y+3}:null;const [oldUpper,newUpper,oldLower,newLower]=batch.read(targets,coverage);

  for(const [i,a,b] of [[0,oldUpper,newUpper],[1,oldLower,newLower]]){const o=outputs[i];morph(a,b,q,o.data.data);compactPolish(polishJoint,o.data.data,q,oldUpper,newUpper,oldLower,newLower,W,H,1,processingBounds);
   o.context.putImageData(o.data,0,0);o.texture.baseTexture.update();o.sprite.visible=true;}
  back.model.visible=false;arm.model.visible=false;glove.model.visible=false;
 }
 apply.dispose=()=>{batch.dispose();for(const rt of targets)rt.destroy(true);};return apply;
}
