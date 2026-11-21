// Pack cropped native render targets on the GPU, then synchronize only once.
// Integer device-pixel alignment and nearest sampling preserve the source texels.
export function createBatchedReadback(PIXI,app,crop,resolution,count){
 const W=Math.round(crop.width*resolution),H=Math.round(crop.height*resolution),stage=new PIXI.Container();
 const target=PIXI.RenderTexture.create({width:W/resolution,height:H*count/resolution,resolution});
 target.baseTexture.scaleMode=PIXI.SCALE_MODES.NEAREST;
 const slots=Array.from({length:count},(_,i)=>{const s=new PIXI.Sprite();s.position.set(0,i*H/resolution);stage.addChild(s);return s;});
 const textures=new Map(),expanded=Array.from({length:count},()=>new Uint8Array(W*H*4));
 return{read(inputs,bounds=null){
 const x0=bounds?Math.min(W,Math.max(0,Math.floor((bounds.left-crop.x)*resolution)-3)):0,y0=bounds?Math.min(H,Math.max(0,Math.floor((bounds.top-crop.y)*resolution)-3)):0;
 const x1=bounds?Math.min(W,Math.ceil((bounds.right-crop.x)*resolution)+3):W,y1=bounds?Math.min(H,Math.ceil((bounds.bottom-crop.y)*resolution)+3):H;
 if(x1<=x0||y1<=y0)return inputs.map((_,i)=>{expanded[i].fill(0);return expanded[i];});
 const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0),frame=new PIXI.Rectangle(crop.x+x0/resolution,crop.y+y0/resolution,w/resolution,h/resolution);
 for(let i=0;i<count;i++){const s=slots[i],rt=inputs[i];s.visible=!!rt;if(!rt)continue;let texture=textures.get(rt);if(!texture){texture=new PIXI.Texture(rt.baseTexture,frame.clone());textures.set(rt,texture);}else texture.frame=frame.clone();s.texture=texture;s.position.set(0,i*h/resolution);}
 app.renderer.render(stage,{renderTexture:target,clear:true});const bytes=app.renderer.extract.pixels(target,new PIXI.Rectangle(0,0,w/resolution,h*inputs.length/resolution));
 return inputs.map((_,i)=>{const out=expanded[i];out.fill(0);for(let y=0;y<h;y++)out.set(bytes.subarray((i*w*h+y*w)*4,(i*w*h+(y+1)*w)*4),((y+y0)*W+x0)*4);return out;});

 },dispose(){for(const t of textures.values())t.destroy(false);stage.destroy({children:true});target.destroy(true);}};
}
