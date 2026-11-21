export function createMaterialMorph(W,H,scale=1,originX=0,originY=0){const N=W*H,limit=5*scale,da=new Float32Array(N),db=new Float32Array(N);
 function distance(a,d,roi){d.fill(1000);
  for(let y=Math.max(1,roi.y0);y<=Math.min(H-2,roi.y1);y++)for(let x=Math.max(1,roi.x0);x<=Math.min(W-2,roi.x1);x++){const i=y*W+x,v=a[i*4+3]>=128;if(v!==(a[i*4-1]>=128)||v!==(a[i*4+7]>=128)||v!==(a[(i-W)*4+3]>=128)||v!==(a[(i+W)*4+3]>=128))d[i]=.5;}
  for(let y=Math.max(1,roi.y0);y<=Math.min(H-1,roi.y1);y++)for(let x=Math.max(1,roi.x0);x<=Math.min(W-2,roi.x1);x++){const i=y*W+x;d[i]=Math.min(d[i],d[i-1]+1,d[i-W]+1,d[i-W-1]+1.414,d[i-W+1]+1.414);}
  for(let y=Math.min(H-2,roi.y1);y>=Math.max(0,roi.y0);y--)for(let x=Math.min(W-2,roi.x1);x>=Math.max(1,roi.x0);x--){const i=y*W+x;d[i]=Math.min(d[i],d[i+1]+1,d[i+W]+1,d[i+W-1]+1.414,d[i+W+1]+1.414);}
  for(let i=0;i<N;i++)if(a[i*4+3]<128)d[i]=-d[i];
 }
 const c=[0,0,0];
 function rgba(a,x,y){x=Math.max(originX,Math.min(originX+W-1.001,x));y=Math.max(originY,Math.min(originY+H-1.001,y));const gx=Math.floor(x),gy=Math.floor(y),ix=gx-originX,iy=gy-originY,fx=x-gx,fy=y-gy;c[0]=c[1]=c[2]=0;let alpha=0;
  for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const k=((iy+dy)*W+ix+dx)*4,z=(dx?fx:1-fx)*(dy?fy:1-fy)*a[k+3]/255;alpha+=z;c[0]+=a[k]*z;c[1]+=a[k+1]*z;c[2]+=a[k+2]*z;}
  if(alpha>1e-6){c[0]/=alpha;c[1]/=alpha;c[2]/=alpha;}else c[0]=c[1]=c[2]=0;
 }
 const at=(d,xx,yy)=>d[Math.max(0,Math.min(H-1,yy))*W+Math.max(0,Math.min(W-1,xx))];
 let px=0,py=0;
 function project(d,x,y,i,phi){const gx=(at(d,x+1,y)-at(d,x-1,y))/2,gy=(at(d,x,y+1)-at(d,x,y-1))/2,L=Math.hypot(gx,gy);if(L<.01){px=x+originX;py=y+originY;return;}const shift=Math.max(-limit,Math.min(limit,phi-d[i]));px=(x+originX)+gx/L*shift;py=(y+originY)+gy/L*shift;}
 return function morph(a,b,q,out){if(q>.9999){out.set(b);return;}if(q<.0001){out.set(a);return;}let x0=W,y0=H,x1=-1,y1=-1;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;if(a[i+3]||b[i+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}out.fill(0);if(x1<0)return;const roi={x0:Math.max(0,x0-8),y0:Math.max(0,y0-8),x1:Math.min(W-1,x1+8),y1:Math.min(H-1,y1+8)};distance(a,da,roi);distance(b,db,roi);
  for(let y=roi.y0;y<=roi.y1;y++)for(let x=roi.x0;x<=roi.x1;x++){const i=y*W+x,k=i*4;if(da[i]<=-.5&&db[i]<=-.5)continue;const phi=da[i]*(1-q)+db[i]*q,alpha=Math.max(0,Math.min(1,phi+.5));if(alpha===0)continue;
   project(da,x,y,i,phi);rgba(a,px,py);const r0=c[0],g0=c[1],b0=c[2];project(db,x,y,i,phi);rgba(b,px,py);
   out[k]=Math.round(r0*(1-q)+c[0]*q);out[k+1]=Math.round(g0*(1-q)+c[1]*q);out[k+2]=Math.round(b0*(1-q)+c[2]*q);out[k+3]=Math.round(alpha*255);
  }
 };
}

function dilate(a,b,W,H,r){const m=new Uint8Array(W*H),t=new Uint8Array(W*H);
 for(let i=0;i<W*H;i++)m[i]=a[i*4+3]>=128||b[i*4+3]>=128?1:0;
 for(let y=0;y<H;y++){const row=y*W;let n=0;for(let x=0;x<Math.min(W,r);x++)n+=m[row+x];for(let x=0;x<W;x++){if(x+r<W)n+=m[row+x+r];if(x-r-1>=0)n-=m[row+x-r-1];t[row+x]=n>0?1:0;}}
 const o=new Uint8Array(W*H);
 for(let x=0;x<W;x++){let n=0;for(let y=0;y<Math.min(H,r);y++)n+=t[y*W+x];for(let y=0;y<H;y++){if(y+r<H)n+=t[(y+r)*W+x];if(y-r-1>=0)n-=t[(y-r-1)*W+x];o[y*W+x]=n>0?1:0;}}
 return o;
}
export function polishJoint(out,q,upperA,upperB,foreA,foreB,W,H,scale=1){
 const strength=4*q*(1-q);if(strength===0)return;
 const raw=Uint8ClampedArray.from(out),r=Math.max(1,Math.round(3*scale)),nu=dilate(upperA,upperB,W,H,r),nf=dilate(foreA,foreB,W,H,r);
 // Fixed-size buffers + insertion sort give the same numeric medians without allocation.
 const buf=[new Int32Array(9),new Int32Array(9),new Int32Array(9),new Int32Array(9)],len=[0,0,0,0];
 const put=(j,v)=>{const a=buf[j];let n=len[j]++;while(n>0&&a[n-1]>v){a[n]=a[n-1];n--;}a[n]=v;};
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x,k=i*4;if(!raw[k+3]||!nu[i]||!nf[i])continue;
  len[0]=len[1]=len[2]=len[3]=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=W||yy<0||yy>=H)continue;const z=(yy*W+xx)*4;put(3,raw[z+3]);if(raw[z+3]>=128){put(0,raw[z]);put(1,raw[z+1]);put(2,raw[z+2]);}}
  for(let j=0;j<3;j++)if(len[j])out[k+j]=Math.round(raw[k+j]*(1-strength)+buf[j][len[j]>>1]*strength);
  out[k+3]=Math.min(raw[k+3],Math.round(raw[k+3]*(1-strength)+buf[3][len[3]>>1]*strength));
 }
}

