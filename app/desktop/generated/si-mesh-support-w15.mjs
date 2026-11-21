// Texture coordinates and alpha support never change with the motion. Keep the
// vertices of every triangle that can sample nonzero alpha (plus filter padding).
// UV orientation is conservatively covered in both directions.
export function meshSupport(drawables,textures){return drawables.ids.map((id,i)=>{
 const tex=textures[drawables.textureIndices[i]],uv=drawables.vertexUvs[i],tri=drawables.indices[i];
 if(!tex||!uv||!tri)return null;const marked=new Uint8Array(uv.length/2),b=tex.bounds;if(!b)return new Uint16Array();
 const x0=(b[0]-64)/tex.width,x1=(b[2]+64)/tex.width,y0=(b[1]-64)/tex.height,y1=(b[3]+64)/tex.height;
 for(let k=0;k<tri.length;k+=3){let l=Infinity,r=-Infinity,t=Infinity,d=-Infinity;
 for(let n=0;n<3;n++){const v=tri[k+n],x=uv[v*2],y=uv[v*2+1];l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);d=Math.max(d,y);}
 if(r<x0||l>x1||((d<y0||t>y1)&&(d<1-y1||t>1-y0)))continue;
 for(let n=0;n<3;n++)marked[tri[k+n]]=1;
 }
 return Uint16Array.from(Array.from(marked,(v,k)=>v?k:-1).filter(k=>k>=0));
 });}
