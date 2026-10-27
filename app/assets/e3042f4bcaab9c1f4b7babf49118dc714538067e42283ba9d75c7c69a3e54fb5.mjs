export function createA06Dissolve() {
  const filter = new PIXI.Filter(
    undefined,
    `
 precision highp float;varying vec2 vTextureCoord;uniform sampler2D uSampler;uniform float progress;uniform vec4 inputSize;
 float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
 void main(){vec4 c=texture2D(uSampler,vTextureCoord);vec2 p=vTextureCoord*inputSize.xy/3.0,i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=mix(mix(noise(i),noise(i+vec2(1.,0.)),f.x),mix(noise(i+vec2(0.,1.)),noise(i+vec2(1.,1.)),f.x),f.y);float keep=smoothstep(progress-.045,progress+.025,n);float edge=(1.-smoothstep(.0,.07,abs(n-progress)))*.28;gl_FragColor=vec4(min(c.rgb+vec3(.12,.19,.23)*edge*c.a,c.a),c.a)*keep;}
 `,
    { progress: 0 },
  );
  return filter;
}
