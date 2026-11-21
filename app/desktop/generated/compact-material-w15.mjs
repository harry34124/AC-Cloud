// Keep the original numerical kernels. Trim only empty margins, retaining their
// boundary conditions and enough zero padding for every neighbourhood operation.
function bounds(arrays,W,H,pad,hint=null){let l=W,t=H,r=-1,b=-1;if(hint){l=Math.max(0,Math.floor(hint.left));t=Math.max(0,Math.floor(hint.top));r=Math.min(W-1,Math.ceil(hint.right));b=Math.min(H-1,Math.ceil(hint.bottom));}else{
 for(const a of arrays)for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(a[(y*W+x)*4+3]){if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;}
 }if(r<l||b<t)return null;l=Math.max(0,l-pad);t=Math.max(0,t-pad);r=Math.min(W-1,r+pad);b=Math.min(H-1,b+pad);return{x:l,y:t,w:r-l+1,h:b-t+1};}
function copyIn(a,b,q,W){for(let y=0;y<q.h;y++)b.set(a.subarray(((q.y+y)*W+q.x)*4,((q.y+y)*W+q.x+q.w)*4),y*q.w*4);}
function copyOut(a,b,q,W){for(let y=0;y<q.h;y++)b.set(a.subarray(y*q.w*4,(y+1)*q.w*4),((q.y+y)*W+q.x)*4);}
export function compactMorph(factory,W,H,scale=1,getBounds=null){let cache;
 return(a,b,q,out)=>{if(q>.9999){out.set(b);return}if(q<.0001){out.set(a);return}
 const rect=bounds([a,b],W,H,Math.max(8,Math.ceil(5*scale)+2),getBounds?.());out.fill(0);if(!rect)return;
 if(!cache||cache.w!==rect.w||cache.h!==rect.h||cache.x!==rect.x||cache.y!==rect.y){const {w,h}=rect;cache={w,h,x:rect.x,y:rect.y,a:new Uint8ClampedArray(w*h*4),b:new Uint8ClampedArray(w*h*4),out:new Uint8ClampedArray(w*h*4),run:factory(w,h,scale,rect.x,rect.y)};}
 copyIn(a,cache.a,rect,W);copyIn(b,cache.b,rect,W);cache.run(cache.a,cache.b,q,cache.out);copyOut(cache.out,out,rect,W);
 };
}
export function compactPolish(kernel,out,q,a,b,c,d,W,H,scale=1,hint=null){
 if(q===0||q===1)return;const rect=bounds([out,a,b,c,d],W,H,Math.max(8,Math.round(3*scale)+2),hint);if(!rect)return;
 const arrays=[out,a,b,c,d].map(a=>{const b=new Uint8ClampedArray(rect.w*rect.h*4);copyIn(a,b,rect,W);return b;});
 kernel(arrays[0],q,...arrays.slice(1),rect.w,rect.h,scale);copyOut(arrays[0],out,rect,W);
}
