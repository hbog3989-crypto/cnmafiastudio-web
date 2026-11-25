import{r as R,j as he}from"./index-CN_1agoL.js";const W=5,de=3,Le=2.4,j=19e4,q=1e3/30,Fe=`#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`,Ce=`#version 300 es
precision highp float;
precision highp int;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uStops[${W}];
uniform int uStopCount;
uniform float uAmplitude;
uniform float uBlend;
uniform float uHeight;
uniform float uScale;
uniform float uGlow;
uniform float uBrightness;
uniform int uLayers;
uniform float uFlip;
uniform vec3 uPointer;
uniform float uReveal;
uniform float uOpacity;
uniform float uLightMode;
out vec4 outColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l;
  m = m * m * m;
  s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

vec3 ramp(float t) {
  float x = clamp(t, 0.0, 1.0) * float(uStopCount - 1);
  int i = int(min(floor(x), float(uStopCount - 2)));
  float f = x - float(i);
  f = f * f * (3.0 - 2.0 * f);
  vec3 lch = mix(uStops[i], uStops[i + 1], f);
  lch.x = mix(lch.x, min(lch.x, 0.7), uLightMode);
  return toSrgb(oklabToLinear(vec3(lch.x, lch.y * cos(lch.z), lch.y * sin(lch.z))));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float y = 1.0 - frag.y / uResolution.y;
  y = mix(y, 1.0 - y, uFlip);
  float u = frag.x / uResolution.x;
  float X = (frag.x - uResolution.x * 0.5) / uResolution.y;
  float t = uTime;
  float reach = uPointer.z * exp(-pow((X - uPointer.x) / 0.38, 2.0));

  vec3 glow = vec3(0.0);
  float cover = 0.0;
  for (int k = 0; k < ${de}; k++) {
    if (k >= uLayers) break;
    float layer = float(k);
    float seed = layer * 13.7;
    float pace = t * (1.0 - layer * 0.18);
    float warp = snoise(vec2(X * 0.45 * uScale + pace * 0.02 + seed, pace * 0.05 + seed));
    float wave = snoise(vec2(X * 0.75 * uScale + warp * 0.35 - pace * 0.03 + seed, pace * 0.07 - seed)) * 0.72
      + snoise(vec2(X * 1.6 * uScale + warp * 0.5 + pace * 0.04 - seed, pace * 0.1 + seed * 0.5)) * 0.28;
    float hem = uHeight + layer * 0.07 + wave * 0.15 * uAmplitude;
    hem += reach * 0.08 * (layer < 0.5 ? 1.0 : 0.4);
    hem = mix(-0.25, hem, uReveal);

    float soft = (0.04 + uBlend * 0.16) * (1.0 + layer * 0.9);
    float rise = hem - y;
    float low = -soft - uGlow * 0.14;
    float high = 0.26 + soft * 0.6;
    float body = pow(smootherstep(low, high, rise), 1.5 + uGlow * 0.6);
    float lobes = 0.86 + 0.14 * snoise(vec2(X * 0.9 * uScale - pace * 0.025 + seed, y * 0.3 + pace * 0.04));
    float alpha = body * lobes * (layer < 0.5 ? 1.0 : 0.32 / layer);
    alpha = clamp(alpha * (1.0 + reach * 0.25 * smootherstep(0.9, 0.0, abs(y - hem))), 0.0, 1.0);

    vec3 tint = ramp(u + 0.05 * sin(pace * 0.08 + layer * 2.3) + layer * 0.1 + max(rise, 0.0) * 0.05);
    glow = 1.0 - (1.0 - glow) * (1.0 - tint * alpha);
    cover = 1.0 - (1.0 - cover) * (1.0 - alpha);
  }

  float fade = smootherstep(0.0, 0.7, uReveal) * uOpacity;
  float strength = clamp(uBrightness, 0.0, 2.0);
  glow *= fade * min(strength, 1.0);
  cover *= fade * min(strength, 1.0);
  glow = 1.0 - pow(1.0 - glow, vec3(max(strength, 1.0)));
  float dither = (hash(frag) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    vec3 tint = cover > 0.0001 ? glow / cover : vec3(0.0);
    cover *= smootherstep(0.0, 0.25, cover);
    float alpha = cover * 0.7;
    outColor = vec4(tint * alpha + dither, clamp(alpha + dither, 0.0, 1.0));
    return;
  }
  outColor = vec4(glow + dither, clamp(cover + dither, 0.0, 1.0));
}`,E=(r,s,l)=>Math.min(l,Math.max(s,r)),Te=r=>{const[s,l,n]=r.map(P=>P<=.04045?P/12.92:Math.pow((P+.055)/1.055,2.4)),u=Math.cbrt(.4122214708*s+.5363325363*l+.0514459929*n),h=Math.cbrt(.2119034982*s+.6806995451*l+.1073969566*n),x=Math.cbrt(.0883024619*s+.2817188376*l+.6299787005*n),p=[.2104542553*u+.793617785*h-.0040720468*x,1.9779984951*u-2.428592205*h+.4505937099*x,.0259040371*u+.7827717662*h-.808675766*x];return[p[0],Math.hypot(p[1],p[2]),Math.atan2(p[2],p[1])]},Ie=r=>{const s=r.findIndex(u=>u[1]>.02);let n=s===-1?0:r[s][2];return r.map(u=>{let h=u[1]>.02?u[2]:n;for(;h-n>Math.PI;)h-=Math.PI*2;for(;h-n<-Math.PI;)h+=Math.PI*2;return n=h,[u[0],u[1],h]})},me=(r,s,l)=>{const n=r.createShader(s);return n?(r.shaderSource(n,l),r.compileShader(n),r.getShaderParameter(n,r.COMPILE_STATUS)?n:(r.deleteShader(n),null)):null},ze=r=>{const s=me(r,r.VERTEX_SHADER,Fe),l=me(r,r.FRAGMENT_SHADER,Ce),n=r.createProgram();if(!s||!l||!n)return s&&r.deleteShader(s),l&&r.deleteShader(l),n&&r.deleteProgram(n),null;if(r.attachShader(n,s),r.attachShader(n,l),r.bindAttribLocation(n,0,"aPosition"),r.linkProgram(n),r.deleteShader(s),r.deleteShader(l),!r.getProgramParameter(n,r.LINK_STATUS))return r.deleteProgram(n),null;const u={},h=r.getProgramParameter(n,r.ACTIVE_UNIFORMS);for(let x=0;x<h;x++){const p=r.getActiveUniform(n,x);p&&(u[p.name.replace("[0]","")]=r.getUniformLocation(n,p.name))}return{program:n,uniforms:u}},_e=({colorStops:r=["#5227FF","#7cff67","#5227FF"],amplitude:s=1,blend:l=.5,speed:n=1,time:u,height:h=.45,scale:x=1,glow:p=.6,brightness:P=1,layers:pe=1,direction:ve="top",mouseInteraction:xe=!0,interactionRef:k,pointerPositionRef:G,minimumVisible:H=0,intro:ge=!0,opacity:ye=1,lightMode:we=!1,paused:Me=!1,dpr:Ae,className:Y="",style:be})=>{const $=R.useRef(null),K=R.useRef(null),U=R.useRef(null),L=(Array.isArray(r)?r:[]).filter(Boolean).map(String).slice(0,W),J={stops:L.length>=2?L:L.length===1?[L[0],L[0]]:["#5227FF","#7cff67"],amplitude:Math.max(0,s),blend:E(l,0,1),speed:n,time:u,height:E(h,0,1),scale:Math.max(.1,x),glow:Math.max(0,p),brightness:Math.max(0,P),layers:E(Math.round(pe),1,de),flip:ve==="bottom"?1:0,mouseInteraction:xe,intro:ge,opacity:E(ye,0,1),lightMode:we,paused:Me,dpr:Ae},v=R.useRef(J);return v.current=J,R.useEffect(()=>{const M=$.current,m=K.current,t=m?.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!1,stencil:!1,powerPreference:"low-power",failIfMajorPerformanceCaveat:!0});if(!M||!m||!t)return;const F=ze(t);if(!F)return;const f=F.uniforms,C=t.createBuffer(),A=t.createVertexArray();if(!C||!A){C&&t.deleteBuffer(C),A&&t.deleteVertexArray(A),t.deleteProgram(F.program);return}t.bindVertexArray(A),t.bindBuffer(t.ARRAY_BUFFER,C),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW),t.enableVertexAttribArray(0),t.vertexAttribPointer(0,2,t.FLOAT,!1,0,0);const b=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),T=window.matchMedia("(prefers-reduced-motion: reduce)"),V=new Map,Se=e=>{if(V.has(e))return V.get(e);let o=[1,1,1];if(b){b.clearRect(0,0,1,1),b.fillStyle="#ffffff",b.fillStyle=e,b.fillRect(0,0,1,1);const[i,d,g]=b.getImageData(0,0,1,1).data;o=[i/255,d/255,g/255]}return V.set(e,o),o},Q=new Float32Array(W*3),S={width:1,height:1},c={x:0,y:0,inside:!1},a={clock:0,px:0,py:.5,reach:0,reveal:v.current.intro&&!T.matches?0:1};let y=0,I=0,z=0,_=!("IntersectionObserver"in window),B=!0,O=!1,Z=!1;const Re=()=>{const{dpr:e}=v.current,o=Math.max(1,M.clientWidth),i=Math.max(1,M.clientHeight),d=Math.min(e||window.devicePixelRatio||1,2,Math.sqrt(j/(o*i)));S.width=o,S.height=i;const g=E(Math.floor(o*d),1,j),N=Math.max(1,Math.min(Math.floor(i*d),Math.floor(j/g)));m.width!==g&&(m.width=g),m.height!==N&&(m.height=N),B=!1},ee=()=>{const e=v.current;Ie(e.stops.map(i=>Te(Se(i)))).forEach((i,d)=>Q.set(i,d*3));const o=a.reveal;t.viewport(0,0,m.width,m.height),t.useProgram(F.program),t.bindVertexArray(A),t.uniform2f(f.uResolution,m.width,m.height),t.uniform1f(f.uTime,e.time!==void 0?e.time*e.speed*.1:a.clock),t.uniform3fv(f.uStops,Q),t.uniform1i(f.uStopCount,e.stops.length),t.uniform1f(f.uAmplitude,e.amplitude),t.uniform1f(f.uBlend,e.blend),t.uniform1f(f.uHeight,e.height),t.uniform1f(f.uScale,e.scale),t.uniform1f(f.uGlow,e.glow),t.uniform1f(f.uBrightness,e.brightness),t.uniform1i(f.uLayers,e.layers),t.uniform1f(f.uFlip,e.flip),t.uniform3f(f.uPointer,a.px,a.py,a.reach),t.uniform1f(f.uReveal,1-Math.pow(1-o,3)),t.uniform1f(f.uOpacity,e.opacity),t.uniform1f(f.uLightMode,e.lightMode?1:0),t.drawArrays(t.TRIANGLES,0,3)},te=e=>{if(y=0,!_||document.hidden||O)return;if(e+1<z){X();return}z=e-z>q?e+q:z+q,B&&Re();const o=v.current,i=I?E((e-I)/1e3,5e-4,.1):1/60;if(I=e,o.paused||T.matches){a.reveal=1,a.reach=0,ee(),I=0;return}a.clock+=i*o.speed;const d=o.mouseInteraction&&c.inside,g=1-Math.exp(-i/.38);if(d){const N=(c.x-S.width/2)/S.height,Pe=o.flip?1-c.y/S.height:c.y/S.height;a.px+=(N-a.px)*g,a.py+=(Pe-a.py)*g}a.reach+=((d?1:0)-a.reach)*(1-Math.exp(-i/(d?.55:1.4))),o.intro?a.reveal<1&&(a.reveal=Math.min(1,a.reveal+i/Le)):a.reveal=1,ee(),y=requestAnimationFrame(te)},X=()=>{!y&&_&&!document.hidden&&!O&&(y=requestAnimationFrame(te))},Ee=()=>{B=!0,X()},D=e=>{const o=(k?.current??M).getBoundingClientRect();c.x=e.clientX-o.left,c.y=e.clientY-o.top;const i=c.inside;if(c.inside=c.x>=0&&c.y>=0&&c.x<=o.width&&c.y<=o.height,c.inside&&!i){const d=v.current;a.px=(c.x-o.width/2)/Math.max(1,o.height),a.py=d.flip?1-c.y/Math.max(1,o.height):c.y/Math.max(1,o.height)}v.current.paused||X()},re=e=>{e.pointerType!=="mouse"&&(c.inside=!1)},oe=()=>{c.inside=!1},ne=k?.current??window,ae=k?.current??document.documentElement,ie=[["pointermove",D],["pointerdown",D],["pointerup",re],["pointercancel",re]],ce=e=>{Z!==e&&(Z=e,e?(ie.forEach(([o,i])=>ne.addEventListener(o,i,{passive:!0})),ae.addEventListener("pointerleave",oe),G?.current&&D(G.current)):(ie.forEach(([o,i])=>ne.removeEventListener(o,i)),ae.removeEventListener("pointerleave",oe),c.inside=!1))},w=()=>{const e=_&&!document.hidden&&!O,o=v.current;ce(e&&o.mouseInteraction&&!o.paused&&!T.matches),e?X():(cancelAnimationFrame(y),y=0,I=0,z=0)},se=()=>{O=!0,m.style.visibility="hidden",w()},le=new ResizeObserver(Ee);le.observe(M);const fe="IntersectionObserver"in window?new IntersectionObserver(e=>{_=e.some(o=>o.isIntersecting&&o.intersectionRatio>=H),w()},{threshold:H}):null;fe?.observe(M),document.addEventListener("visibilitychange",w),T.addEventListener("change",w),m.addEventListener("webglcontextlost",se);let ue=v.current.dpr;return U.current=()=>{const e=v.current;e.dpr!==ue&&(ue=e.dpr,B=!0),w()},()=>{cancelAnimationFrame(y),U.current=null,le.disconnect(),fe?.disconnect(),ce(!1),document.removeEventListener("visibilitychange",w),T.removeEventListener("change",w),m.removeEventListener("webglcontextlost",se),t.deleteProgram(F.program),t.deleteBuffer(C),t.deleteVertexArray(A),m.isConnected||t.getExtension("WEBGL_lose_context")?.loseContext()}},[k,H,G]),R.useEffect(()=>{U.current?.()}),he.jsx("div",{ref:$,className:`aurora-container${Y?` ${Y}`:""}`,style:be,children:he.jsx("canvas",{ref:K,className:"aurora-canvas","aria-hidden":"true"})})};export{_e as default};
