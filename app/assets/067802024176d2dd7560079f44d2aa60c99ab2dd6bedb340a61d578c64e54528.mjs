// A58 w13 火焰凶字：轮廓顶点直接取自已认可的 glyph.json（与w8逐字节相同，不改字形），
// 四笔先合成一个整体遮罩再在着色器里统一燃烧——笔画交叉处不会再看到叠层；
// 收尾不是淡出，而是火从字里烧穿：烧蚀前沿发亮成余烬线，火舌脱离上升，火星飘散，最后烧尽。
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
// 纹理覆盖的字形坐标范围（字形约1100×1100；上方留出火舌空间）
const X0 = -140,
  Y0 = -560,
  GW = 1400,
  GH = 1760,
  TS = 0.36; // 纹理像素/字形单位
const ORDER = ["left", "hook", "descending", "ascending"];

const VS = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}`;
const FS = `precision highp float;varying vec2 uv;
uniform sampler2D s0,s1,s2,s3;uniform vec4 r0,r1,r2,r3;uniform vec2 g0,g1,g2,g3;
uniform float uT,uBurn,uA;uniform vec4 uBox;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.3);a*=.5;}return s/.9375;}
vec2 G2U(vec2 g){return (g-uBox.xy)/uBox.zw;}
// 每一笔：r=(方向x,方向y,投影最小,投影最大)；g=(出笔进度0..1以上, 点燃余热)
float rev(vec2 pos,vec4 r,vec2 g){if(g.x<0.)return 0.;float q=(dot(pos,r.xy)-r.z)/(r.w-r.z);return smoothstep(q-.06,q,g.x*1.08);}
// 烧蚀场：大尺度+细碎，烧穿从边缘和薄处开始
float burnD(vec2 pos){return fbm(pos/150.)*.62+fbm(pos/60.+7.)*.13+(1.-pos.y/1000.)*.25;}
float alive(vec2 pos,float th){return smoothstep(th,th+.06,burnD(pos));}
float rv0,rv1,rv2,rv3;
float U4(vec2 g,int ch){vec2 u=G2U(g);vec4 a=texture2D(s0,u),b=texture2D(s1,u),c=texture2D(s2,u),d=texture2D(s3,u);
 if(ch==0)return max(max(a.r*rev(g,r0,g0),b.r*rev(g,r1,g1)),max(c.r*rev(g,r2,g2),d.r*rev(g,r3,g3)));
 if(ch==1)return max(max(a.g*rev(g,r0,g0),b.g*rev(g,r1,g1)),max(c.g*rev(g,r2,g2),d.g*rev(g,r3,g3)));
 return max(max(a.b*rev(g,r0,g0),b.b*rev(g,r1,g1)),max(c.b*rev(g,r2,g2),d.b*rev(g,r3,g3)));}
float IG(vec2 g){vec2 u=G2U(g);return max(max(texture2D(s0,u).g*g0.y*rev(g,r0,g0),texture2D(s1,u).g*g1.y*rev(g,r1,g1)),max(texture2D(s2,u).g*g2.y*rev(g,r2,g2),texture2D(s3,u).g*g3.y*rev(g,r3,g3)));}
void main(){
 vec2 pos=uBox.xy+uv*uBox.zw;float t=uT;
 float burning=uBurn>0.?1.:0.,bp=max(uBurn,0.);
 float th=bp*1.25-.18;
 // 往上走的细长湍流：火舌的长短、摆动
 float nt=fbm(vec2(pos.x/34.,pos.y/80.+t*3.4));
 float nw=fbm(vec2(pos.x/90.+3.,pos.y/120.+t*1.7));
 float nf=fbm(vec2(pos.x/14.,pos.y/26.+t*6.5));
 float nflow=fbm(vec2(pos.x/26.,pos.y/70.+t*2.4));
 vec2 wob=vec2(nf-.5,nw-.5)*4.;
 float core=U4(pos+wob,0),inner=U4(pos,1),halo=U4(pos,2),core0=core;
 float lift=1.+bp*.6;
 // 火舌：往下找字，离字越高越弱；长度随湍流变化，形成一条条舌头
 float flame=0.;float len=(70.+280.*pow(nt,1.6))*lift;
 float jit=h21(floor(pos/3.)+fract(t*7.));for(int k=1;k<=14;k++){float d=(float(k)-.5+jit)*16.;vec2 sp=pos+vec2((nw-.5)*d*.9,d);
   float m=U4(sp,1);if(burning>0.)m*=alive(sp,th-.08-d/900.);flame=max(flame,m*clamp(1.-d/len,0.,1.));}
 flame=clamp(flame*1.25-(nf-.5)*.55-.08,0.,1.);
 if(burning>0.){float al=alive(pos+wob,th);core*=al;inner*=al;halo*=al;}
 // 字身：饱和橙，中心沿笔画走一条白热芯，表面有往上流的明暗
 float ctr=U4(pos,0)*smoothstep(.97,1.,inner);float Tc=core*(.42+.2*smoothstep(.6,1.,inner)+.2*(nflow-.5)+.1*(nf-.5))+.28*ctr*(.7+.6*nflow);
 float ember=0.;
 if(burning>0.){float D=burnD(pos+wob);ember=core0*smoothstep(th-.07,th-.005,D)*(1.-smoothstep(th,th+.04,D))*(.8+.4*nf);}
 float heat=burning*.16*smoothstep(0.,.12,bp)*(1.-smoothstep(.3,.6,bp));
 float T=max(max(Tc+heat*core,flame*.72),ember)+IG(pos)*.25;
 T*=1.-smoothstep(.95,1.12,bp);
 vec3 c=vec3(.42,.03,.0);
 c=mix(c,vec3(.93,.2,.03),smoothstep(.18,.38,T));
 c=mix(c,vec3(1.,.46,.07),smoothstep(.36,.56,T));
 c=mix(c,vec3(1.,.72,.26),smoothstep(.56,.74,T));
 c=mix(c,vec3(1.,.92,.66),smoothstep(.74,.9,T));
 c=mix(c,vec3(1.,1.,.95),smoothstep(.9,1.,T));
 float a=smoothstep(.1,.36,T);
 float hl=halo*.09*(1.-smoothstep(.9,1.1,bp));
 vec3 col=c*a+vec3(1.,.3,.06)*hl*(1.-a);
 gl_FragColor=vec4(col,a+hl*(1.-a))*uA;
}`;

export function createFireGlyph(data) {
  const strokes = ORDER.map((name) => {
    const pts = data[name],
      p = new Path2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return { name, pts, path: p };
  });
  const TW = Math.round(GW * TS),
    TH = Math.round(GH * TS);
  // 每笔一张纹理：R=遮罩，G=小模糊（笔画内外的“热度”），B=大模糊（火舌源与热辉光）
  function strokeTex(st) {
    const mk = () =>
      Object.assign(document.createElement("canvas"), {
        width: TW,
        height: TH,
      });
    const m = mk(),
      mc = m.getContext("2d");
    mc.setTransform(TS, 0, 0, TS, -X0 * TS, -Y0 * TS);
    mc.fillStyle = "#fff";
    mc.fill(st.path);
    const blur = (r) => {
      const c = mk(),
        x = c.getContext("2d");
      x.filter = `blur(${r}px)`;
      x.drawImage(m, 0, 0);
      x.filter = "none";
      x.drawImage(c, 0, 0);
      return x.getImageData(0, 0, TW, TH).data;
    };
    const a = mc.getImageData(0, 0, TW, TH).data,
      b1 = blur(5),
      b2 = blur(15),
      out = new Uint8Array(TW * TH * 4);
    for (let i = 0; i < TW * TH; i++) {
      out[i * 4] = a[i * 4 + 3];
      out[i * 4 + 1] = Math.min(255, b1[i * 4 + 3] * 1.6);
      out[i * 4 + 2] = Math.min(255, b2[i * 4 + 3] * 1.9);
      out[i * 4 + 3] = 255;
    }
    // 出笔方向上的投影范围
    return { px: out, mask: a };
  }
  const tex = strokes.map(strokeTex);
  // 火星发射点：字内随机点（按笔记录）
  const pts = strokes.map((st, k) => {
    const a = tex[k].mask,
      o = [];
    let s = k * 977 + 13;
    const R = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let n = 0; n < 4000 && o.length < 260; n++) {
      const x = Math.floor(R() * TW),
        y = Math.floor(R() * TH);
      if (a[(y * TW + x) * 4 + 3] > 200) o.push([X0 + x / TS, Y0 + y / TS]);
    }
    return o;
  });

  const glc = document.createElement("canvas");
  const gl = glc.getContext("webgl", {
    premultipliedAlpha: true,
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const lp = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(lp);
  gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
  const U = (n) => gl.getUniformLocation(prog, n);
  tex.forEach((tx, k) => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + k);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      TW,
      TH,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      tx.px,
    );
    for (const [p, v] of [
      [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
      [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
      [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
      [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
    ])
      gl.texParameteri(gl.TEXTURE_2D, p, v);
    gl.uniform1i(U("s" + k), k);
  });
  gl.uniform4f(U("uBox"), X0, Y0, GW, GH);
  // 出笔方向（字形坐标，y向下）：竖自上而下；钩随第二刀从右下往左上；交叉两笔随第三刀
  const DIRS = {
    left: [0, 1],
    hook: [-0.8, -0.6],
    descending: [0.49, 0.87],
    ascending: [-0.85, 0.53],
  };
  const proj = strokes.map((st) => {
    const d = DIRS[st.name];
    let lo = 1e9,
      hi = -1e9;
    for (const [x, y] of st.pts) {
      const q = x * d[0] + y * d[1];
      lo = Math.min(lo, q);
      hi = Math.max(hi, q);
    }
    return [d[0], d[1], lo, hi];
  });
  proj.forEach((r, k) => gl.uniform4f(U("r" + k), ...r));
  const rnd = (i) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  // 火星：一直有少量往上飘；烧尽时大量迸出
  function sparks(ctx, { t, births, burnAt, burnDur }, map, sc) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    const drawP = (x, y, vx, vy, size, a, hot) => {
      const [sx, sy] = map(x, y),
        L = Math.min(28, Math.hypot(vx, vy) * 0.035);
      const k = L / Math.max(1e-3, Math.hypot(vx, vy));
      ctx.strokeStyle = hot
        ? `rgba(255,245,215,${a})`
        : `rgba(255,${170 + Math.round(60 * a)},90,${a})`;
      ctx.lineWidth = Math.max(0.8, size * sc);
      ctx.shadowColor = "rgba(255,110,30,.9)";
      ctx.shadowBlur = 6 * sc * 4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - vx * k * sc, sy - vy * k * sc);
      ctx.stroke();
    };
    const end = burnAt + burnDur;
    for (let k = 0; k < 4; k++) {
      const b = births[k];
      if (b == null || t < b) continue;
      const P = pts[k];
      if (!P.length) continue;
      for (let i = 0; i < 16; i++) {
        const L = 0.7 + rnd(i + k * 50) * 0.7,
          ph = rnd(i * 3 + k * 7) * L,
          c = Math.floor((t - b + ph) / L),
          age = t - b + ph - c * L;
        const born = t - age;
        if (born < b || born > end) continue;
        const p = P[Math.floor(rnd(c * 13 + i * 7 + k) * P.length)],
          vy = -(140 + rnd(c + i) * 200),
          vx = Math.sin(age * 5 + i) * 40 + (rnd(c * 5 + i) - 0.5) * 60;
        const x = p[0] + vx * age,
          y = p[1] + vy * age - 30 * age * age,
          a =
            Math.sin((Math.PI * age) / L) *
            (0.55 + 0.45 * Math.sin(t * 40 + i)) *
            (1 - clamp((t - end + 0.2) / 0.3));
        if (a > 0) drawP(x, y, vx, vy - 60 * age, 4 + rnd(i) * 4, a, false);
      }
    }
    const ba = t - burnAt;
    if (ba > 0 && ba < burnDur + 0.9) {
      for (let i = 0; i < 170; i++) {
        const k = i % 4;
        if (births[k] == null) continue;
        const P = pts[k];
        if (!P.length) continue;
        const t0 = rnd(i * 1.7) * burnDur * 0.85,
          age = ba - t0,
          L = 0.55 + rnd(i * 2.3) * 0.75;
        if (age < 0 || age > L) continue;
        const p = P[Math.floor(rnd(i * 5.1) * P.length)],
          ang = -Math.PI / 2 + (rnd(i * 3.3) - 0.5) * 2.2,
          sp = 180 + rnd(i * 7.7) * 420,
          dr = Math.exp(-age * 2.2);
        const vx = Math.cos(ang) * sp * dr,
          vy = Math.sin(ang) * sp * dr - 90;
        const x = p[0] + (Math.cos(ang) * sp * (1 - dr)) / 2.2,
          y =
            p[1] +
            (Math.sin(ang) * sp * (1 - dr)) / 2.2 -
            90 * age -
            40 * age * age;
        const a = (1 - age / L) * (0.6 + 0.4 * Math.sin(t * 55 + i));
        drawP(x, y, vx, vy, 3 + rnd(i * 9.1) * 5, a, rnd(i * 4.4) > 0.7);
      }
    }
    ctx.restore();
  }

  let cw = 0,
    ch = 0;
  return {
    // births[k]：第k笔出笔开始时刻（null=未出）；reveal：出笔用时
    draw(ctx, { t, births, burnAt, burnDur = 1, x, y, scale, reveal = 0.07 }) {
      if (births.every((b) => b == null || t < b)) return;
      if (t > burnAt + burnDur + 1) return;
      const outW = GW * scale,
        outH = GH * scale,
        q = Math.min(1, 900 / Math.max(outW, outH));
      const w = Math.max(8, Math.round(outW * q)),
        h = Math.max(8, Math.round(outH * q));
      if (w !== cw || h !== ch) {
        glc.width = cw = w;
        glc.height = ch = h;
      }
      gl.viewport(0, 0, w, h);
      gl.useProgram(prog);
      births.forEach((b, k) => {
        const g =
          b == null || t < b
            ? [-1, 0]
            : [
                clamp((t - b) / reveal, 0, 1.2),
                Math.exp(-(t - b - reveal) * 6) *
                  (t - b > reveal ? 1 : (t - b) / reveal),
              ];
        gl.uniform2f(U("g" + k), g[0], g[1]);
      });
      gl.uniform1f(U("uT"), t);
      gl.uniform1f(U("uBurn"), t < burnAt ? -1 : (t - burnAt) / burnDur);
      gl.uniform1f(U("uA"), 1);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      ctx.drawImage(glc, x + X0 * scale, y + Y0 * scale, outW, outH);
      sparks(
        ctx,
        { t, births, burnAt, burnDur },
        (gx, gy) => [x + gx * scale, y + gy * scale],
        scale,
      );
    },
  };
}
