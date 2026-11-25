import{r as ue,j as kt}from"./index-CN_1agoL.js";const Fo=.32,Ht=9,Fe=.05,Ze=160,_e=1.7,Pe=.45,To=2.8,$e=4,Ut=4,Be=160,Ro=1/30,wo=1/45,je=48,Mo=48e3,ut=[{pixels:42e4,meshPixels:112e3,cells:38e3},{pixels:32e4,meshPixels:86e3,cells:29e3},{pixels:216e3,meshPixels:64e3,cells:22e3},{pixels:135e3,meshPixels:48e3,cells:16500},{pixels:86e3,meshPixels:48e3,cells:16500}],Xt=60,Ve=100,bo=1e3/87,So=140,Gt=.12,Lo=[-.81,.58,-.02],Vt={forward:[0,1],backward:[0,-1],left:[-1,0],right:[1,0]},Co=["lift","trace","light"],Ao={plus:0,dots:1},_o=1.25,Ke=`
precision highp float;
precision highp int;

uniform float uFrequency;
uniform vec2 uMorph;
uniform sampler2D uSculpt;
uniform float uSculptOn;
uniform vec4 uPulses[${$e}];
uniform vec3 uEye;
uniform vec3 uForward;
uniform vec3 uNear;

uint lattice(ivec2 p) {
  uvec2 q = uvec2(p + 1073741824);
  uint h = q.x * 2654435761u + q.y * 2246822519u;
  h = (h ^ (h >> 15u)) * 739982445u;
  h = (h ^ (h >> 12u)) * 695872825u;
  return h ^ (h >> 15u);
}

float corner(ivec2 c, vec2 f) {
  uint h = lattice(c);
  vec2 g = vec2(float(h & 65535u), float(h >> 16u)) / 32767.5 - 1.0;
  return dot(g, f);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = p - i;
  ivec2 c = ivec2(i);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = corner(c, f);
  float b = corner(c + ivec2(1, 0), f - vec2(1.0, 0.0));
  float d = corner(c + ivec2(0, 1), f - vec2(0.0, 1.0));
  float e = corner(c + ivec2(1, 1), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(d, e, u.x), u.y);
}

vec2 octave(vec2 p, vec2 shift) {
  return vec2(1.6 * p.x - 1.2 * p.y, 1.2 * p.x + 1.6 * p.y) + shift;
}

float relief(vec2 t) {
  vec2 p = t * uFrequency;
  vec2 w = vec2(noise(p * 0.42 + uMorph), noise(p * 0.42 - uMorph.yx + vec2(5.2, 1.3)));
  p += w * 0.8;
  float n = noise(p) * 0.55;
  p = octave(p, vec2(7.1, 3.7));
  n += noise(p) * 0.15;
  p = octave(p, vec2(1.9, 8.3));
  n += noise(p) * 0.04;
  float s = log(1.0 + exp(7.0 * (3.0 * n + 0.05))) / 7.0;
  return s * s * 1.4 + 0.1 * n;
}

float swell(vec2 t) {
  float lift = 0.0;
  for (int i = 0; i < ${$e}; i++) {
    vec4 p = uPulses[i];
    if (p.w <= 0.0) continue;
    float x = (length(t - p.xy) - p.z) / (0.28 + p.z * 0.05);
    lift += exp(-x * x) * p.w;
  }
  return lift;
}

vec4 sculpted(vec2 t) {
  return uSculptOn > 0.5 ? textureLod(uSculpt, t / ${je}.0, 0.0) : vec4(0.0);
}

float settle(vec2 world) {
  float depth = dot(vec3(world.x, 0.0, world.y) - uEye, uForward);
  float x = clamp((depth - uNear.x) / max(uNear.y - uNear.x, 1e-3), 0.0, 1.0);
  return mix(uNear.z, 1.0, x * x * x * (x * (x * 6.0 - 15.0) + 10.0));
}
`,Po=`#version 300 es
${Ke}
uniform ivec2 uBase;
uniform float uCell;
uniform float uDetail;
layout(location = 0) out vec4 outField;
layout(location = 1) out vec4 outHeight;

void main() {
  vec2 t = vec2(uBase + ivec2(gl_FragCoord.xy)) * uCell;
  vec4 carved = sculpted(t);
  float ring = swell(t);
  float ground = relief(t) + carved.r + ring * 0.14;
  vec2 dp = t * uFrequency * 5.0 + vec2(13.1, 4.7);
  float fine = noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3;
  outField = vec4(carved.g, ring, ground, carved.r);
  outHeight = vec4(ground + uDetail * 0.1 * fine, 0.0, 0.0, 1.0);
}`,Do=a=>`#version 300 es
#define BAKED ${a?1:0}
${Ke}
uniform sampler2D uField;
uniform ivec2 uOrigin;
uniform ivec2 uCamCell;
uniform vec2 uCamFrac;
uniform float uCell;
uniform int uStride;
uniform float uHeight;
uniform mat4 uViewProj;
out vec2 vTexel;
out vec2 vTerrain;
out float vDepth;
out float vLift;
out vec3 vNormal;

float ground(vec2 t) {
  return relief(t) + swell(t) * 0.14;
}

void main() {
  ivec2 step = ivec2(gl_VertexID >> 1, gl_InstanceID + (gl_VertexID & 1)) * uStride;
  ivec2 local = uOrigin + step;
  vec2 terrain = vec2(local + uCamCell) * uCell;
  vec2 world = vec2(local) * uCell - uCamFrac;
  float k = settle(world);
#if BAKED
  ivec2 texel = step + 2;
  vec4 c = texelFetch(uField, texel, 0);
  vec4 l = texelFetch(uField, texel - ivec2(1, 0), 0);
  vec4 r = texelFetch(uField, texel + ivec2(1, 0), 0);
  vec4 d = texelFetch(uField, texel - ivec2(0, 1), 0);
  vec4 u = texelFetch(uField, texel + ivec2(0, 1), 0);
  float h = (c.b - c.a) * k + c.a;
  float dx = (l.b - l.a - r.b + r.a) * k + l.a - r.a;
  float dz = (d.b - d.a - u.b + u.a) * k + d.a - u.a;
  vNormal = vec3(dx * uHeight / (2.0 * uCell), 1.0, dz * uHeight / (2.0 * uCell));
  vTexel = vec2(texel) + 0.5;
#else
  float h = ground(terrain) * k;
  float hx = ground(terrain + vec2(0.04, 0.0)) * k;
  float hz = ground(terrain + vec2(0.0, 0.04)) * k;
  vNormal = vec3((h - hx) * uHeight / 0.04, 1.0, (h - hz) * uHeight / 0.04);
  vTexel = vec2(0.0);
#endif
  vec4 clip = uViewProj * vec4(world.x, h * uHeight, world.y, 1.0);
  gl_Position = clip;
  vTerrain = terrain;
  vDepth = clip.w;
  vLift = h * uHeight;
}`,Bo=a=>`#version 300 es
#define BAKED ${a?1:0}
${Ke}
uniform sampler2D uField;
uniform highp sampler2D uHeightField;
uniform float uDetail;
uniform float uLines;
uniform float uLineWidth;
uniform float uMajor;
uniform vec3 uColor;
uniform float uBrightness;
uniform vec2 uFade;
uniform vec3 uFocus;
uniform vec4 uHeat;
uniform vec4 uLamp;
uniform vec4 uTrace;
uniform vec3 uSun;
uniform float uRefDepth;
uniform float uReveal;
uniform float uLightMode;
uniform float uOpacity;
uniform vec4 uGlitch[3];
uniform float uGlitchSeed;
uniform float uPixel;
in vec2 vTexel;
in vec2 vTerrain;
in float vDepth;
in float vLift;
in vec3 vNormal;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

float stroke(float dist, float width, float soft, float density, float crowd) {
  float cover = max(0.0, min(min(width, soft), 0.5 * (width + soft) - dist)) / soft;
  return mix(cover, min(width * density, 1.0) * 0.6, crowd);
}

float sampleHeight(vec2 coord, out vec2 slope) {
  vec2 u = coord - 0.5;
  vec2 i = floor(u + 0.5);
  vec2 f = u - i;
  vec3 wx = vec3(0.5 * (0.5 - f.x) * (0.5 - f.x), 0.75 - f.x * f.x, 0.5 * (0.5 + f.x) * (0.5 + f.x));
  vec3 wy = vec3(0.5 * (0.5 - f.y) * (0.5 - f.y), 0.75 - f.y * f.y, 0.5 * (0.5 + f.y) * (0.5 + f.y));
  vec3 dx = vec3(f.x - 0.5, -2.0 * f.x, 0.5 + f.x);
  vec3 dy = vec3(f.y - 0.5, -2.0 * f.y, 0.5 + f.y);
  ivec2 base = ivec2(i) - 1;
  float total = 0.0;
  slope = vec2(0.0);
  for (int y = 0; y < 3; y++) {
    float a = texelFetch(uHeightField, base + ivec2(0, y), 0).r;
    float b = texelFetch(uHeightField, base + ivec2(1, y), 0).r;
    float c = texelFetch(uHeightField, base + ivec2(2, y), 0).r;
    float row = a * wx.x + b * wx.y + c * wx.z;
    total += row * wy[y];
    slope += vec2((a * dx.x + b * dx.y + c * dx.z) * wy[y], row * dy[y]);
  }
  return total;
}

void main() {
  float py = gl_FragCoord.y / uPixel;
  float shift = 0.0;
  float split = 0.0;
  for (int i = 0; i < 3; i++) {
    if (py >= uGlitch[i].x && py < uGlitch[i].y) {
      shift = uGlitch[i].z * uPixel;
      split = uGlitch[i].w * uPixel;
    }
  }
  vec2 spot = vTerrain - dFdx(vTerrain) * shift;
#if BAKED
  vec2 ex = dFdx(vTexel);
  vec2 ey = dFdy(vTexel);
  vec2 coord = vTexel - ex * shift;
  vec2 slope;
  float h = sampleHeight(coord, slope);
  vec4 field = texture(uField, coord / vec2(textureSize(uField, 0)));
  float trail = field.r;
  float ring = field.g;
  float gx = dot(slope, ex) * uLines;
  float gy = dot(slope, ey) * uLines;
#else
  vec2 dp = spot * uFrequency * 5.0 + vec2(13.1, 4.7);
  float ring = swell(spot);
  float h = relief(spot) + ring * 0.14 + uDetail * 0.1 * (noise(dp) * 0.6 + noise(octave(dp, vec2(2.3, 6.1))) * 0.3);
  float trail = 0.0;
  float gx = dFdx(h) * uLines;
  float gy = dFdy(h) * uLines;
#endif

  float lc = h * uLines + 0.5;
  float density = max(sqrt(gx * gx + gy * gy), 1e-5);
  float dist = abs(fract(lc + 0.5) - 0.5) / density;
  float major = uMajor * (1.0 - step(0.5, mod(floor(lc + 0.5), 5.0)));

  vec2 hd = spot - uHeat.xy;
  float heat = exp(-dot(hd, hd) / (uHeat.z * uHeat.z)) * uHeat.w + trail * 0.6;
  float energy = heat + ring;

  float depth = max(vDepth, 0.01);
  float persp = clamp(sqrt(uRefDepth / depth), 0.6, 1.6);
  float width = uLineWidth * persp * (1.0 + 0.6 * major) * (1.0 + 0.45 * min(energy, 1.5));
  float soft = 1.0 + min(uFocus.y * abs(1.0 - uFocus.x / depth), uFocus.z);
  float crowd = smoothstep(0.3, 0.75, density * max(width, soft));
  float cover = stroke(dist, width, soft, density, crowd);
  vec3 cover3 = vec3(cover);
  if (split > 0.0) {
    float offset = split * density;
    cover3.r = stroke(abs(fract(lc + offset + 0.5) - 0.5) / density, width, soft, density, crowd);
    cover3.b = stroke(abs(fract(lc - offset + 0.5) - 0.5) / density, width, soft, density, crowd);
    vec2 block = floor(vec2(gl_FragCoord.x / (uPixel * 26.0), py / 5.0)) + uGlitchSeed * 71.0;
    float drop = fract(sin(dot(block, vec2(12.9898, 78.233))) * 43758.5453);
    cover3 *= drop > 0.82 ? 0.1 : 1.2;
  }

  vec3 normal = normalize(vNormal);
  float sun = clamp(dot(normal, uSun), 0.0, 1.0);
  vec3 toLamp = uLamp.xyz - vec3(vTerrain.x, vLift, vTerrain.y);
  float lampDistance = length(toLamp);
  float lamp = clamp(dot(normal, toLamp / max(lampDistance, 1e-3)), 0.0, 1.0) * uLamp.w / (1.0 + lampDistance * lampDistance * 0.9);
  float level = mix(0.45, 1.05, smoothstep(0.0, 1.1, h)) * mix(0.35, 1.25, sun * sun) * (1.0 + 0.6 * major);
  level += heat * 1.4 + ring * 3.0 + lamp * 1.2;

  float fade = 1.0 - smoother((depth - uFade.x) / max(uFade.y - uFade.x, 1e-3));
  vec3 light = cover3 * level;

  if (uTrace.y > 0.0) {
    float traceWidth = uLineWidth * persp * 1.8;
    float trace = stroke(abs(h - uTrace.x) * uLines / density, traceWidth, soft, density, crowd);
    vec2 td = spot - uTrace.zw;
    light += trace * uTrace.y * mix(0.35, 1.0, exp(-dot(td, td) / 20.0)) * 2.6;
  }
  light *= fade * uBrightness * uReveal;

  if (uLightMode > 0.5) {
    float ink = (1.0 - exp(-max(max(light.r, light.g), light.b) * 1.8)) * 0.92 * uOpacity;
    outColor = vec4(uColor * ink, ink);
    return;
  }

  vec3 color = 1.0 - exp(-uColor * light * 1.8);
  float top = max(max(color.r, color.g), color.b);
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  color = max(color + dither / 255.0 * step(0.002, top), 0.0);
  outColor = vec4(color, max(max(color.r, color.g), color.b)) * uOpacity;
}`,Io=`#version 300 es
${Ke}
uniform ivec2 uOrigin;
uniform ivec2 uCamCell;
uniform vec2 uCamFrac;
uniform float uSpacing;
uniform int uColumns;
uniform float uHeight;
uniform mat4 uViewProj;
uniform vec2 uView;
uniform float uSize;
uniform float uRefDepth;
uniform vec4 uHeat;
uniform float uTime;
uniform vec4 uGlitch[3];
uniform float uPixel;
out vec2 vCorner;
out float vSize;
out float vGlow;
out float vFrame;
out float vDepth;

void main() {
  ivec2 local = uOrigin + ivec2(gl_InstanceID % uColumns, gl_InstanceID / uColumns);
  ivec2 id = local + uCamCell;
  vec2 terrain = vec2(id) * uSpacing;
  vec2 world = vec2(local) * uSpacing - uCamFrac;
  float ring = swell(terrain);
  float h = (relief(terrain) + ring * 0.14) * settle(world) + sculpted(terrain).r;
  vec4 clip = uViewProj * vec4(world.x, h * uHeight + 0.05, world.y, 1.0);
  uint seed = lattice(id + ivec2(911, 377));
  float a = float(seed & 1023u) / 1023.0;
  float b = float((seed >> 10u) & 1023u) / 1023.0;
  vec2 hd = terrain - uHeat.xy;
  float heat = exp(-dot(hd, hd) / (uHeat.z * uHeat.z)) * uHeat.w;
  float blink = step(0.92, a) * (0.5 + 0.5 * sin(uTime * (1.4 + b * 2.2) + b * 40.0));
  float size = uSize * clamp(sqrt(uRefDepth / max(clip.w, 0.01)), 0.6, 1.3) * (1.0 + 0.4 * heat + 0.35 * blink);
  float frame = max(smoothstep(0.55, 0.95, blink), smoothstep(0.3, 0.8, heat));
  vec2 corner = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1)) * 2.0 - 1.0;
  vec2 offset = corner * (size * (frame > 0.001 ? 2.6 : 1.0) + 1.5);
  float py = (clip.y / clip.w * 0.5 + 0.5) * uView.y / uPixel;
  float shift = 0.0;
  for (int i = 0; i < 3; i++) {
    if (py >= uGlitch[i].x && py < uGlitch[i].y) shift = uGlitch[i].z;
  }
  clip.xy += (offset + vec2(shift * uPixel, 0.0)) / uView * 2.0 * clip.w;
  gl_Position = clip;
  vCorner = offset;
  vSize = size;
  vFrame = frame;
  vGlow = 0.5 + 0.4 * b + blink * 0.9 + heat * 1.8 + ring * 3.0;
  vDepth = clip.w;
}`,No=`#version 300 es
precision highp float;
uniform vec3 uColor;
uniform vec2 uFade;
uniform float uReveal;
uniform float uBrightness;
uniform float uLightMode;
uniform float uOpacity;
uniform float uStyle;
uniform float uPixel;
in vec2 vCorner;
in float vSize;
in float vGlow;
in float vFrame;
in float vDepth;
out vec4 outColor;

float smoother(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 a = abs(vCorner);
  float cover;
  if (uStyle < 0.5) {
    float thick = max(0.6 * uPixel, 0.5);
    float across = clamp(vSize - a.x + 0.5, 0.0, 1.0) * clamp(thick - a.y + 0.5, 0.0, 1.0);
    float down = clamp(vSize - a.y + 0.5, 0.0, 1.0) * clamp(thick - a.x + 0.5, 0.0, 1.0);
    cover = max(across, down);
  } else {
    cover = clamp(vSize * 0.42 - length(vCorner) + 0.5, 0.0, 1.0);
  }
  if (vFrame > 0.001) {
    float edge = vSize * 2.3;
    float reach = edge * 0.45;
    float line = max(0.5 * uPixel, 0.5);
    float sides = clamp(line - abs(a.x - edge) + 0.5, 0.0, 1.0) * clamp(a.y - edge + reach + 0.5, 0.0, 1.0) * clamp(edge + line - a.y + 0.5, 0.0, 1.0);
    float caps = clamp(line - abs(a.y - edge) + 0.5, 0.0, 1.0) * clamp(a.x - edge + reach + 0.5, 0.0, 1.0) * clamp(edge + line - a.x + 0.5, 0.0, 1.0);
    cover = max(cover, max(sides, caps) * vFrame * 0.8);
  }
  float fade = 1.0 - smoother((vDepth - uFade.x) / max(uFade.y - uFade.x, 1e-3));
  float light = cover * vGlow * fade * fade * uReveal * uBrightness;
  if (uLightMode > 0.5) {
    float ink = (1.0 - exp(-light * 1.8)) * 0.92 * uOpacity;
    outColor = vec4(uColor * ink, ink);
    return;
  }
  vec3 color = 1.0 - exp(-uColor * light * 1.8);
  outColor = vec4(color, max(max(color.r, color.g), color.b)) * uOpacity;
}`,De=`#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`,Oo=`#version 300 es
precision highp float;
uniform sampler2D uPrevious;
uniform vec4 uSegment;
uniform vec4 uBrush;
uniform vec4 uBurst;
uniform vec2 uDecay;
out vec4 outColor;

vec2 wrapped(vec2 d) {
  return d - ${je}.0 * floor(d / ${je}.0 + 0.5);
}

void main() {
  vec4 previous = texelFetch(uPrevious, ivec2(gl_FragCoord.xy), 0);
  vec2 t = gl_FragCoord.xy / ${Be}.0 * ${je}.0;
  vec2 a = wrapped(t - uSegment.xy);
  vec2 ab = uSegment.zw - uSegment.xy;
  float k = clamp(dot(a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
  vec2 d = a - ab * k;
  float g = exp(-dot(d, d) / (uBrush.x * uBrush.x)) * uBrush.w;
  float height = previous.r * uDecay.x;
  height += (uBrush.y - height) * g * uBrush.z;
  float heat = previous.g * uDecay.y;
  heat += (1.0 - heat) * g * uBrush.z;
  vec2 b = wrapped(t - uBurst.xy);
  height += uBurst.w * exp(-dot(b, b) / (uBurst.z * uBurst.z));
  outColor = vec4(height, heat, 0.0, 1.0);
}`,zo=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 color = texture(uSource, uv - uTexel);
  color += texture(uSource, uv + uTexel);
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y));
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y));
  outColor = min(color * 0.25, vec4(1.0));
}`,ko=`#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec4 color = texture(uSource, uv) * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135) + texture(uSource, uv - uStep * 1.423135)) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702) + texture(uSource, uv - uStep * 3.326702)) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989) + texture(uSource, uv - uStep * 5.242989)) * 0.018156;
  outColor = color;
}`,Ho=`#version 300 es
precision highp float;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform sampler2D uBloom2;
uniform sampler2D uBloom3;
uniform vec2 uView;
uniform float uGlow;
uniform float uLightMode;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec4 halo = texture(uBloom0, uv) * 0.4;
  halo += texture(uBloom1, uv) * 0.3;
  halo += texture(uBloom2, uv) * 0.2;
  halo += texture(uBloom3, uv) * 0.1;
  if (uLightMode > 0.5) {
    outColor = halo * uGlow * 0.35;
    return;
  }
  vec3 color = halo.rgb * uGlow * 1.6;
  color = color / (1.0 + color);
  outColor = vec4(color, max(max(color.r, color.g), color.b));
}`,B=(a,c,u)=>Math.min(u,Math.max(c,a)),fe=a=>{const c=B(a,0,1);return c*c*c*(c*(c*6-15)+10)},Uo=(a,c)=>{let u=Math.imul(a+1073741824,2654435761)+Math.imul(c+1073741824,2246822519)>>>0;return u=Math.imul(u^u>>>15,739982445)>>>0,u=Math.imul(u^u>>>12,695872825)>>>0,(u^u>>>15)>>>0},qe=(a,c,u,l)=>{const h=Uo(a,c);return((h&65535)/32767.5-1)*u+((h>>>16)/32767.5-1)*l},me=(a,c)=>{const u=Math.floor(a),l=Math.floor(c),h=a-u,y=c-l,I=h*h*h*(h*(h*6-15)+10),Q=y*y*y*(y*(y*6-15)+10),J=qe(u,l,h,y),V=qe(u+1,l,h-1,y),k=qe(u,l+1,h,y-1),U=qe(u+1,l+1,h-1,y-1),q=J+(V-J)*I;return q+(k+(U-k)*I-q)*Q},qt=(a,c,u,l,h)=>{let y=a*u,I=c*u;const Q=me(y*.42+l,I*.42+h),J=me(y*.42-h+5.2,I*.42-l+1.3);y+=Q*.8,I+=J*.8;let V=me(y,I)*.55;const k=1.6*y-1.2*I+7.1,U=1.2*y+1.6*I+3.7;V+=me(k,U)*.15,V+=me(1.6*k-1.2*U+1.9,1.2*k+1.6*U+8.3)*.04;const q=Math.log(1+Math.exp(7*(3*V+.05)))/7;return q*q*1.4+.1*V},Xo=(a,c,u)=>{const l=a*u*5+13.1,h=c*u*5+4.7;return me(l,h)*.6+me(1.6*l-1.2*h+2.3,1.2*l+1.6*h+6.1)*.3},Zt=(a,c,u)=>{const l=a.createShader(c);return l?(a.shaderSource(l,u),a.compileShader(l),l):null},he=(a,c,u)=>{const l=Zt(a,a.VERTEX_SHADER,c),h=Zt(a,a.FRAGMENT_SHADER,u),y=a.createProgram();return!l||!h||!y?null:(a.attachShader(y,l),a.attachShader(y,h),a.linkProgram(y),a.deleteShader(l),a.deleteShader(h),{program:y,uniforms:{}})},jt=(a,c)=>{if(!a.getProgramParameter(c.program,a.LINK_STATUS))return!1;const u=a.getProgramParameter(c.program,a.ACTIVE_UNIFORMS);for(let l=0;l<u;l++){const h=a.getActiveUniform(c.program,l);h&&(c.uniforms[h.name.replace(/\[0\]$/,"")]=a.getUniformLocation(c.program,h.name))}return!0},Go=a=>{let c=String(a||"#ffffff").replace("#","").trim();(c.length===3||c.length===4)&&(c=c.slice(0,3).split("").map(l=>l+l).join(""));const u=parseInt(c.slice(0,6),16);return Number.isNaN(u)?[1,1,1]:[(u>>16&255)/255,(u>>8&255)/255,(u&255)/255]},Vo=(a,c)=>{const u=Math.cos(c),l=[Math.sin(a)*u,-Math.sin(c),Math.cos(a)*u],h=[Math.cos(a),0,-Math.sin(a)],y=[l[1]*h[2]-l[2]*h[1],l[2]*h[0]-l[0]*h[2],l[0]*h[1]-l[1]*h[0]];return{f:l,r:h,u:y}},lt=a=>B(.4877/a,Fo,.6),qo=({eye:a,f:c,r:u,u:l},h,y)=>{const I=1/lt(h),Q=1/(Fe-Ze),J=[u[0],l[0],-c[0],0,u[1],l[1],-c[1],0,u[2],l[2],-c[2],0,-(u[0]*a[0]+u[1]*a[1]+u[2]*a[2]),-(l[0]*a[0]+l[1]*a[1]+l[2]*a[2]),c[0]*a[0]+c[1]*a[1]+c[2]*a[2],1],V=[I/h,0,0,0,0,I,0,0,0,0,(Ze+Fe)*Q,-1,0,0,2*Ze*Fe*Q,0];for(let k=0;k<4;k++)for(let U=0;U<4;U++){let q=0;for(let de=0;de<4;de++)q+=V[de*4+U]*J[k*4+de];y[k*4+U]=q}return y},jo=({color:a="#4f7cff",lineCount:c=22,lineWidth:u=1.2,majorLines:l=!0,elevation:h=1,foreground:y=.2,scale:I=1,detail:Q=.35,tilt:J=32,speed:V=.25,direction:k="forward",morph:U=.2,glow:q=.6,depthOfField:de=.4,fog:$t=.35,brightness:Kt=1,opacity:Wt=1,mouseInteraction:Yt=!0,interactionRef:We,hoverEffect:ct="lift",mouseRadius:Qt=1,mouseStrength:Jt=.6,trail:eo=.3,parallax:to=.5,clickEffect:oo="pulse",markers:ro="none",glitch:io=0,intro:no=!0,lightMode:ao=!1,dpr:uo,className:lo="",style:co})=>{const st=ue.useRef(null),ft=ue.useRef(null),Ye=ue.useRef(null),Ie=ue.useRef(0),[so,fo]=ue.useState(0),ht={color:a,lineCount:B(c,2,80),lineWidth:Math.max(.2,u),majorLines:l,elevation:B(h,0,3),foreground:B(y,0,1),scale:B(I,.2,5),detail:B(Q,0,1),tilt:B(J,12,90),speed:V,direction:Vt[k]??Vt.forward,morph:Math.max(0,U),glow:Math.max(0,q),depthOfField:B(de,0,1),fog:B($t,0,1),brightness:Math.max(0,Kt),opacity:B(Wt,0,1),mouseInteraction:Yt,hoverEffect:Co.includes(ct)?ct:"lift",mouseRadius:Math.max(.1,Qt),mouseStrength:Math.max(0,Jt),trail:B(eo,0,1),parallax:B(to,0,1),clickEffect:oo,markers:Ao[ro]??-1,glitch:B(io,0,1),intro:no,lightMode:ao,dpr:uo},X=ue.useRef(ht);return X.current=ht,ue.useEffect(()=>{const ve=st.current,P=ft.current;if(!ve||!P||!window.ResizeObserver||!window.IntersectionObserver)return;const e=P.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,depth:!0,stencil:!1,powerPreference:"low-power",failIfMajorPerformanceCaveat:!0});if(!e)return;cancelAnimationFrame(Ie.current),Ie.current=0;const Ne=e.getExtension("KHR_parallel_shader_compile"),Te=!!e.getExtension("EXT_color_buffer_float"),Re=he(e,Do(Te),Bo(Te));let ee=Te?he(e,De,Po):null,te=Te?he(e,De,Oo):null;const le=he(e,De,zo),oe=he(e,De,ko),we=he(e,De,Ho),Me=he(e,Io,No);if(!Re||!le||!oe||!we||!Me)return;const Qe=()=>[Re,ee,te,le,oe,we,Me].filter(Boolean),mt=()=>!Ne||Qe().every(t=>e.getProgramParameter(t.program,Ne.COMPLETION_STATUS_KHR)),dt=t=>!t||jt(e,t)?t:(e.deleteProgram(t.program),null),vt=()=>(ee=dt(ee),te=dt(te),[Re,le,oe,we,Me].every(t=>jt(e,t)));if(!Ne&&!vt()){Qe().forEach(t=>e.deleteProgram(t.program));return}const pt=t=>{t.preventDefault(),Xe()},xt=()=>fo(t=>t+1);P.addEventListener("webglcontextlost",pt),P.addEventListener("webglcontextrestored",xt);const gt=e.createVertexArray(),ho=Te?e.RGBA16F:e.RGBA8,be=(t,r,s,n)=>{const i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texStorage2D(e.TEXTURE_2D,1,s,t,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,n),i},Je=()=>({texture:null,framebuffer:e.createFramebuffer(),depth:null,width:0,height:0}),et=(t,r,s,n)=>{t.texture&&t.width===r&&t.height===s||(t.texture&&e.deleteTexture(t.texture),t.texture=be(r,s,ho,e.CLAMP_TO_EDGE),t.width=r,t.height=s,e.bindFramebuffer(e.FRAMEBUFFER,t.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t.texture,0),n&&(t.depth||(t.depth=e.createRenderbuffer()),e.bindRenderbuffer(e.RENDERBUFFER,t.depth),e.renderbufferStorage(e.RENDERBUFFER,e.DEPTH_COMPONENT24,r,s),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,t.depth)))},Oe=Je(),ze=Array.from({length:Ut},()=>[Je(),Je()]);let N=te?[0,1].map(()=>{const t=be(Be,Be,e.RG16F,e.REPEAT),r=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,r),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0),e.clearColor(0,0,0,0),e.clear(e.COLOR_BUFFER_BIT),{texture:t,framebuffer:r}}):null;const Se=be(1,1,e.RGBA8,e.REPEAT),F={texture:null,heights:null,framebuffer:e.createFramebuffer(),width:0,height:0};let pe=0;const mo=(t,r)=>{F.texture&&t<=F.width&&r<=F.height||(F.texture&&e.deleteTexture(F.texture),F.heights&&e.deleteTexture(F.heights),F.width=Math.max(t,Math.ceil(F.width*1.25),64),F.height=Math.max(r,Math.ceil(F.height*1.25),64),F.texture=be(F.width,F.height,e.RGBA16F,e.CLAMP_TO_EDGE),F.heights=be(F.width,F.height,e.R32F,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,F.heights),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.bindFramebuffer(e.FRAMEBUFFER,F.framebuffer),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,F.texture,0),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT1,e.TEXTURE_2D,F.heights,0),e.drawBuffers([e.COLOR_ATTACHMENT0,e.COLOR_ATTACHMENT1]))},Z=(t,r)=>{e.activeTexture(e.TEXTURE0+t),e.bindTexture(e.TEXTURE_2D,r)},j=window.matchMedia?.("(prefers-reduced-motion: reduce)").matches??!1,tt=new Float32Array(16),Le=new Float32Array($e*4),xe=new Float32Array(12),H={until:0,next:1.5,roll:0,seed:0};let ot=7919;const $=()=>(ot=ot*16807%2147483647,(ot-1)/2147483646),K=[],D={x:0,y:0,clientX:0,clientY:0,inside:!1,pending:!1},d={width:1,height:1,ratio:1,meshRatio:1,cell:.05,cellKey:""},v={level:0,start:0,frames:0,cpu:0,steady:0},w={target:Xt,start:0,last:0,frames:0,fast:0},o={intro:X.current.intro&&!j?0:1,rise:1,travelX:0,travelZ:0,morph:0,yaw:0,pitch:0,yawVelocity:0,pitchVelocity:0,presence:0,focus:Ht,hit:null,brushFrom:null,sculptLife:0,burst:null,level:0,trace:0,clock:0,tilt:X.current.tilt,elevation:X.current.elevation,scale:X.current.scale};o.rise=fe(o.intro);let re=0,Ce=0,ie=0,ge=0,Ae=0,Ee=!1,ke=0,He=!Ne,Et=!1;const yt=()=>{const t=Math.min(o.tilt*Math.PI/180+o.pitch,Math.PI/2-1e-4),r=Vo(o.yaw,t),s=o.elevation*_e*o.rise*.18,n=o.elevation*_e*o.rise*1.3+.9,i=Math.max(Ht,(n-s)/Math.sin(t));return{...r,distance:i,eye:[-r.f[0]*i,s-r.f[1]*i,-r.f[2]*i]}},rt=(t,r,s)=>{const n=d.width/d.height,i=lt(n),m=[0,1,2].map(E=>t.f[E]+t.r[E]*r*i*n+t.u[E]*s*i),T=Math.hypot(m[0],m[1],m[2]);return m.map(E=>E/T)},it=(t,r)=>r[0]*t.f[0]+r[1]*t.f[1]+r[2]*t.f[2],nt=(t,r)=>{const s=rt(t,0,r);return s[1]>-.001?1/0:t.eye[1]/-s[1]*it(t,s)},Ft=(t,r)=>[nt(t,-1)*.9,t.distance,r.foreground],vo=(t,r,s,n)=>{const i=(s-t.eye[0])*t.f[0]-t.eye[1]*t.f[1]+(n-t.eye[2])*t.f[2];return r[2]+(1-r[2])*fe((i-r[0])/Math.max(r[1]-r[0],.001))},Tt=(t,r,s,n)=>{const i=rt(t,s,n),m=o.elevation*_e*o.rise,T=Pe/o.scale,E=Ft(t,r),R=p=>{const O=t.eye[0]+i[0]*p,S=t.eye[2]+i[2]*p,W=qt(o.travelX+O,o.travelZ+S,T,o.morph*.37,o.morph*.23);return t.eye[1]+i[1]*p-W*m*vo(t,E,O,S)};let L=Fe,b=R(L);for(let p=0;p<200&&L<Ze*.5;p++){const O=L+Math.max(.02,b*.4),S=R(O);if(S<0){let W=L,z=O;for(let ce=0;ce<10;ce++){const Y=(W+z)*.5;R(Y)<0?z=Y:W=Y}return{x:o.travelX+t.eye[0]+i[0]*z,y:t.eye[1]+i[1]*z,z:o.travelZ+t.eye[2]+i[2]*z,depth:z*it(t,i)}}L=O,b=S}return null},po=(t,r,s)=>{const n=o.elevation*_e*o.rise*1.7+.2+r.mouseStrength,i={minX:1/0,maxX:-1/0,minZ:1/0,maxZ:-1/0,near:1/0},m=(T,E)=>{const R=t.eye[0]+T[0]*E,L=t.eye[2]+T[2]*E;i.minX=Math.min(i.minX,R),i.maxX=Math.max(i.maxX,R),i.minZ=Math.min(i.minZ,L),i.maxZ=Math.max(i.maxZ,L)};for(const T of[-1.08,0,1.08])for(const E of[-1.08,1.08]){const R=rt(t,T,E),L=Math.max(it(t,R),.001);let b=Fe,p=s*1.05/L;R[1]<-1e-4&&(b=Math.max(Fe,(t.eye[1]-n)/-R[1]),p=Math.min(p,t.eye[1]/-R[1])),b=Math.min(b,p),m(R,b),m(R,p),i.near=Math.min(i.near,b*L)}return i},Rt=(t,r)=>{const s=Math.floor(o.travelX/r),n=Math.floor(o.travelZ/r),i=o.travelX-s*r,m=o.travelZ-n*r,T=Math.floor((t.minX+i)/r)-2,E=Math.floor((t.minZ+m)/r)-2,R=B(Math.ceil((t.maxX+i)/r)+2-T,1,4e3),L=B(Math.ceil((t.maxZ+m)/r)+2-E,1,Math.floor(Mo*1.5/R));return{cell:r,camX:s,camZ:n,fracX:i,fracZ:m,k0:T,m0:E,columns:R,rows:L}},xo=t=>{if(!He)return;const r=X.current;qo(t,d.width/d.height,tt);const s=nt(t,-1),n=Math.min(nt(t,1),t.distance*3.2),i=Math.max(n,s*1.6,t.distance*1.4),m=i+(s*1.8-i)*r.fog,T=m*.7+(s*.7-m*.7)*r.fog,E=po(t,r,m),R=`${d.width}x${d.height}@${d.meshRatio}|${v.level}|${Math.round(o.tilt/4)}|${Math.round(o.elevation*5)}|${r.fog}`;if(R!==d.cellKey){d.cellKey=R;const x=d.height*d.meshRatio*.5/lt(d.width/d.height);let C=B(14*Math.max(E.near,.5)/x,.02,.4);const M=(E.maxX-E.minX)*(E.maxZ-E.minZ)/(C*C),_=ut[v.level].cells;M>_&&(C*=Math.sqrt(M/_)),d.cell=C}const L=Go(r.color),b=o.elevation*_e*o.rise,p=Rt(E,d.cell),O=Ft(t,r),S=r.markers>=0?Rt(E,_o):null,z=(o.hit&&r.mouseInteraction?o.presence:0)*(.35+.5*r.mouseStrength),ce=r.depthOfField*d.height*.016,Y=fe(o.intro/.35),ye=o.hit?o.hit.x:0,se=o.hit?o.hit.z:0;if(Le.fill(0),K.forEach((x,C)=>{Le.set([x.x,x.z,x.age*4.2,Math.exp(-x.age*1.1)*fe(x.age/.08)],C*4)}),e.bindVertexArray(gt),ee){const x=p.columns+7,C=p.rows+7;mo(x,C),e.bindFramebuffer(e.FRAMEBUFFER,F.framebuffer),e.viewport(0,0,x,C),e.useProgram(ee.program);const M=ee.uniforms;Z(0,N?N[pe].texture:Se),e.uniform1i(M.uSculpt,0),e.uniform1f(M.uSculptOn,N?1:0),e.uniform1f(M.uFrequency,Pe/o.scale),e.uniform2f(M.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(M.uPulses,Le),e.uniform2i(M.uBase,p.k0-2+p.camX,p.m0-2+p.camZ),e.uniform1f(M.uCell,p.cell),e.uniform1f(M.uDetail,r.detail),e.disable(e.DEPTH_TEST),e.disable(e.BLEND),e.drawArrays(e.TRIANGLES,0,3)}const A=(x,C,M,_)=>{e.viewport(0,0,C,M),e.useProgram(Re.program);const f=Re.uniforms;if(Z(0,ee?F.texture:Se),e.uniform1i(f.uField,0),Z(1,ee?F.heights:Se),e.uniform1i(f.uHeightField,1),e.uniform1f(f.uFrequency,Pe/o.scale),e.uniform2f(f.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(f.uPulses,Le),e.uniform2i(f.uOrigin,p.k0,p.m0),e.uniform2i(f.uCamCell,p.camX,p.camZ),e.uniform2f(f.uCamFrac,p.fracX,p.fracZ),e.uniform1f(f.uCell,p.cell),e.uniform1i(f.uStride,_),e.uniform1f(f.uHeight,b),e.uniform3fv(f.uEye,t.eye),e.uniform3fv(f.uForward,t.f),e.uniform3fv(f.uNear,O),e.uniform1f(f.uRefDepth,t.distance),e.uniformMatrix4fv(f.uViewProj,!1,tt),e.uniform1f(f.uDetail,r.detail),e.uniform1f(f.uLines,r.lineCount),e.uniform1f(f.uLineWidth,r.lineWidth*x),e.uniform1f(f.uMajor,r.majorLines?1:0),e.uniform3fv(f.uColor,L),e.uniform1f(f.uBrightness,r.brightness),e.uniform2f(f.uFade,T,m),e.uniform3f(f.uFocus,o.focus,ce*x,d.height*.03*x),e.uniform4f(f.uHeat,ye,se,.9*r.mouseRadius,z),e.uniform4f(f.uLamp,ye,o.hit?o.hit.y+1.4:0,se,z),e.uniform4f(f.uTrace,o.level,o.trace,ye,se),e.uniform3fv(f.uSun,Lo),e.uniform1f(f.uReveal,Y),e.uniform1f(f.uLightMode,r.lightMode?1:0),e.uniform1f(f.uOpacity,r.opacity),e.uniform4fv(f.uGlitch,xe),e.uniform1f(f.uGlitchSeed,H.seed),e.uniform1f(f.uPixel,x),e.enable(e.DEPTH_TEST),e.depthFunc(e.LESS),e.disable(e.BLEND),e.clearColor(0,0,0,0),e.clearDepth(1),e.clear(e.COLOR_BUFFER_BIT|e.DEPTH_BUFFER_BIT),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,2*(Math.ceil(p.columns/_)+1),Math.ceil(p.rows/_)),S){e.useProgram(Me.program);const g=Me.uniforms;Z(2,N?N[pe].texture:Se),e.uniform1i(g.uSculpt,2),e.uniform1f(g.uSculptOn,N?1:0),e.uniform1f(g.uFrequency,Pe/o.scale),e.uniform2f(g.uMorph,o.morph*.37,o.morph*.23),e.uniform4fv(g.uPulses,Le),e.uniform3fv(g.uEye,t.eye),e.uniform3fv(g.uForward,t.f),e.uniform3fv(g.uNear,O),e.uniform2i(g.uOrigin,S.k0,S.m0),e.uniform2i(g.uCamCell,S.camX,S.camZ),e.uniform2f(g.uCamFrac,S.fracX,S.fracZ),e.uniform1f(g.uSpacing,S.cell),e.uniform1i(g.uColumns,S.columns+1),e.uniform1f(g.uHeight,b),e.uniformMatrix4fv(g.uViewProj,!1,tt),e.uniform2f(g.uView,C,M),e.uniform1f(g.uSize,4*x),e.uniform1f(g.uRefDepth,t.distance),e.uniform4f(g.uHeat,ye,se,1.2*r.mouseRadius,z),e.uniform1f(g.uTime,o.clock),e.uniform4fv(g.uGlitch,xe),e.uniform1f(g.uPixel,x),e.uniform3fv(g.uColor,L),e.uniform2f(g.uFade,T,m),e.uniform1f(g.uReveal,Y),e.uniform1f(g.uBrightness,r.brightness),e.uniform1f(g.uLightMode,r.lightMode?1:0),e.uniform1f(g.uOpacity,r.opacity),e.uniform1f(g.uStyle,r.markers),e.depthFunc(e.LEQUAL),e.depthMask(!1),e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA),e.drawArraysInstanced(e.TRIANGLE_STRIP,0,4,(S.columns+1)*(S.rows+1)),e.disable(e.BLEND),e.depthMask(!0)}e.disable(e.DEPTH_TEST)},G=r.glow>.001;if(G){const x=Math.max(1,Math.round(d.width/2)),C=Math.max(1,Math.round(d.height/2));et(Oe,x,C,!0),ze.forEach((_,f)=>{const g=Math.max(1,Math.round(d.width/2**(f+2))),zt=Math.max(1,Math.round(d.height/2**(f+2)));et(_[0],g,zt,!1),et(_[1],g,zt,!1)}),e.bindFramebuffer(e.FRAMEBUFFER,Oe.framebuffer),A(.5,x,C,2);let M=Oe;ze.forEach(([_,f])=>{e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),e.viewport(0,0,_.width,_.height),e.useProgram(le.program),Z(0,M.texture),e.uniform1i(le.uniforms.uSource,0),e.uniform2f(le.uniforms.uTarget,_.width,_.height),e.uniform2f(le.uniforms.uTexel,1/M.width,1/M.height),e.drawArrays(e.TRIANGLES,0,3),e.useProgram(oe.program),e.uniform1i(oe.uniforms.uSource,0),e.uniform2f(oe.uniforms.uTarget,f.width,f.height),e.bindFramebuffer(e.FRAMEBUFFER,f.framebuffer),Z(0,_.texture),e.uniform2f(oe.uniforms.uStep,1/_.width,0),e.drawArrays(e.TRIANGLES,0,3),e.bindFramebuffer(e.FRAMEBUFFER,_.framebuffer),Z(0,f.texture),e.uniform2f(oe.uniforms.uStep,0,1/f.height),e.drawArrays(e.TRIANGLES,0,3),M=_})}if(e.bindFramebuffer(e.FRAMEBUFFER,null),A(d.ratio,P.width,P.height,1),G){e.viewport(0,0,P.width,P.height),e.useProgram(we.program);const x=we.uniforms;ze.forEach(([C],M)=>{Z(M,C.texture),e.uniform1i(x[`uBloom${M}`],M)}),e.uniform2f(x.uView,P.width,P.height),e.uniform1f(x.uGlow,r.glow*Y),e.uniform1f(x.uLightMode,r.lightMode?1:0),e.enable(e.BLEND),r.lightMode?e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA):e.blendFunc(e.ONE,e.ONE),e.drawArrays(e.TRIANGLES,0,3),e.disable(e.BLEND)}for(let x=Ut;x>=0;x--)Z(x,null)},go=(t,r,s)=>{if(!N||!te)return!1;const n=r&&t.hoverEffect==="lift"&&o.presence>.001?o.hit:null,i=o.burst;if(!n&&!i&&o.sculptLife<=0)return Ae=0,!1;Ae+=s;const m=w.target===Ve?wo:Ro;if(Ae<m-.002&&!(n&&!o.brushFrom||i?.age===0))return!0;const T=Ae;Ae=0;const E=o.brushFrom||n,R=N[pe],L=N[1-pe];e.bindFramebuffer(e.FRAMEBUFFER,L.framebuffer),e.viewport(0,0,Be,Be),e.useProgram(te.program);const b=te.uniforms;if(Z(0,R.texture),e.uniform1i(b.uPrevious,0),n&&E?e.uniform4f(b.uSegment,E.x,E.z,n.x,n.z):e.uniform4f(b.uSegment,0,0,0,0),e.uniform4f(b.uBrush,1.1*t.mouseRadius,.9*t.mouseStrength,1-Math.exp(-T*7),n?o.presence:0),i){const O=fe(i.age/.7);i.age+=T;const S=(fe(i.age/.7)-O)*.9*Math.max(t.mouseStrength,.3);e.uniform4f(b.uBurst,i.x,i.z,1.6*t.mouseRadius,S),i.age>=.7&&(o.burst=null)}else e.uniform4f(b.uBurst,0,0,1,0);const p=.25+3*t.trail*t.trail;return e.uniform2f(b.uDecay,Math.exp(-T/p),Math.exp(-T/.7)),e.disable(e.BLEND),e.drawArrays(e.TRIANGLES,0,3),pe=1-pe,o.brushFrom=n?{x:n.x,z:n.z}:null,n||i?o.sculptLife=p*6:o.sculptLife-=T,!0};let wt=X.current.dpr,Mt=v.level;const bt=()=>{const t=X.current;wt=t.dpr,Mt=v.level,d.width=Math.max(1,ve.clientWidth),d.height=Math.max(1,ve.clientHeight);const r=ut[v.level],s=d.width*d.height,n=Math.min(t.dpr||window.devicePixelRatio||1,2);d.ratio=Math.min(n,Math.sqrt(r.pixels/s)),d.meshRatio=Math.min(n,Math.sqrt(r.meshPixels/s));const i=Math.max(1,Math.floor(d.width*d.ratio)),m=Math.max(1,Math.floor(d.height*d.ratio));P.width!==i&&(P.width=i),P.height!==m&&(P.height=m)},St=()=>{bt(),ne()},Eo=t=>{if(w.target!==Ve){if(w.last){const r=t-w.last;w.frames++,r>0&&r<=bo&&w.fast++}w.last=t,w.start||(w.start=t),!(t-w.start<So)&&(w.fast>=8&&w.fast>=w.frames*.65&&(w.target=Ve,v.level=Math.max(v.level,1),v.start=0,ie=0),w.start=t,w.frames=0,w.fast=0)}},yo=(t,r)=>{if(!v.start){v.start=t,v.frames=0,v.cpu=0,v.steady=0;return}v.frames++,v.cpu+=r;const s=t-v.start;if(s<900)return;const n=v.frames*1e3/s,i=v.cpu/v.frames,m=w.target===Ve,T=m?1:0;n<(m?91:48)||i>(m?4.5:7)?(v.level=Math.min(v.level+1,ut.length-1),v.steady=0):v.level>T&&n>w.target*.95&&i<(m?2.5:3.5)?++v.steady>=4&&(v.level--,v.steady=0):v.steady=0,v.start=t,v.frames=0,v.cpu=0},Ue=t=>{if(re=0,!Ee||document.hidden||e.isContextLost())return;Eo(t);const r=1e3/w.target;if(t+.75<ie){re=requestAnimationFrame(Ue);return}if(!He){if(!mt()){re=requestAnimationFrame(Ue);return}if(!vt()){Ot();return}!te&&N&&(N.forEach(A=>{e.deleteTexture(A.texture),e.deleteFramebuffer(A.framebuffer)}),N=null),He=!0}const s=performance.now(),n=X.current;(n.dpr!==wt||Mt!==v.level)&&bt();const i=Ce?B((t-Ce)/1e3,0,1/20):r/1e3;Ce=t,ie=ie&&t-ie<r?ie+r:t+r,!n.intro||j?o.intro=1:o.intro<1&&(o.intro=Math.min(1,o.intro+i/To)),o.rise=fe(o.intro);const m=j?1:1-Math.exp(-i/.4);o.tilt+=(n.tilt-o.tilt)*m,o.elevation+=(n.elevation-o.elevation)*m,o.scale=n.scale,o.clock+=i;const T=j?0:n.glitch;if(T>0)if(o.clock>=H.next&&o.clock>=H.until&&(H.until=o.clock+.1+$()*.22*(.5+T),H.next=H.until+(9-7.4*T)*(.45+$()*1.1),H.roll=0),o.clock<H.until){if(o.clock>=H.roll){xe.fill(0);const A=1+Math.floor($()*3);for(let G=0;G<A;G++){const x=3+$()*$()*d.height*.14,C=$()*d.height,M=($()-.5)*2*(10+46*T);xe.set([C,C+x,M,1+$()*3*T],G*4)}H.seed=$(),H.roll=o.clock+.04+$()*.05}}else xe.fill(0);else xe.fill(0);j||(o.travelX+=n.direction[0]*n.speed*.8*i,o.travelZ+=n.direction[1]*n.speed*.8*i,o.morph+=n.morph*.12*i);const E=D.pending;if(E){const{x:A,y:G,inside:x}=Lt(D);D.inside=x,D.pending=!1,x&&(D.x=A,D.y=G)}const R=D.inside&&n.mouseInteraction;o.presence+=((R?1:0)-o.presence)*(1-Math.exp(-i/(R?.18:.45)));const L=D.x/d.width*2-1,b=1-D.y/d.height*2,p=j||!R?0:n.parallax,O=L*p*.09,S=-b*p*.045;o.yawVelocity+=(38*(O-o.yaw)-11*o.yawVelocity)*i,o.pitchVelocity+=(38*(S-o.pitch)-11*o.pitchVelocity)*i,o.yaw+=o.yawVelocity*i,o.pitch+=o.pitchVelocity*i;const W=yt();R&&(E||!ge||t-ge>=70)?(o.hit=Tt(W,n,L,b),ge=t,o.hit&&o.brushFrom&&Math.hypot(o.hit.x-o.brushFrom.x,o.hit.z-o.brushFrom.z)>3*n.mouseRadius&&(o.brushFrom=null)):!R&&o.presence<.002&&(o.hit=null,o.brushFrom=null);const z=o.hit&&n.mouseInteraction&&n.hoverEffect==="trace"?o.presence:0;if(z>0){const A=Pe/o.scale,G=qt(o.hit.x,o.hit.z,A,o.morph*.37,o.morph*.23)+n.detail*.1*Xo(o.hit.x,o.hit.z,A);o.level=o.trace<.01?G:o.level+(G-o.level)*(1-Math.exp(-i/.09))}o.trace+=(z-o.trace)*(1-Math.exp(-i/.2));const ce=o.hit&&n.depthOfField>0?o.hit.depth:W.distance;o.focus+=(ce-o.focus)*(1-Math.exp(-i/.35));for(let A=K.length-1;A>=0;A--)K[A].age+=i,K[A].age>4&&K.splice(A,1);const Y=go(n,R,i);xo(W);const ye=Math.abs(n.tilt-o.tilt)>.01||Math.abs(n.elevation-o.elevation)>1e-4||Math.abs(o.yaw-O)>1e-4||Math.abs(o.pitch-S)>1e-4||Math.abs(o.yawVelocity)>1e-4||Math.abs(o.pitchVelocity)>1e-4||Math.abs(ce-o.focus)>.001||Math.abs(z-o.trace)>.001,se=!j&&(n.speed!==0||n.morph!==0||n.glitch>0||n.markers>=0)||o.intro<1||K.length>0||Y||ye||o.presence>.001&&o.presence<.999;ke=se?0:ke+i,se&&yo(t,performance.now()-s),ke<.5&&(re=requestAnimationFrame(Ue))};function ne(){ke=0,!re&&Ee&&!document.hidden&&!e.isContextLost()&&(Ce=0,ie=0,re=requestAnimationFrame(Ue))}function Xe(){cancelAnimationFrame(re),re=0,Ce=0,ie=0,w.target=Xt,w.start=0,w.last=0,w.frames=0,w.fast=0,v.start=0,v.frames=0,v.cpu=0,v.steady=0}const Lt=t=>{const r=ve.getBoundingClientRect(),s=t.clientX-r.left,n=t.clientY-r.top;return{x:s,y:n,inside:s>=0&&n>=0&&s<=r.width&&n<=r.height}},Ct=t=>{!Ee||j||!X.current.mouseInteraction||(D.clientX=t.clientX,D.clientY=t.clientY,D.pending=!0,ne())},At=t=>{const r=X.current;if(!Ee||j||t.button!==0||t.defaultPrevented||!r.mouseInteraction&&r.glitch===0||t.target instanceof Element&&t.target.closest('a, button, input, textarea, select, label, [role="button"]'))return;const{x:s,y:n,inside:i}=Lt(t);if(!i||(D.x=s,D.y=n,D.inside=!0,D.pending=!1,ge=0,ne(),r.glitch>0&&!j&&(H.until=o.clock+.16,H.roll=0),!r.mouseInteraction||r.clickEffect!=="pulse"&&r.clickEffect!=="peak"))return;const m=Tt(yt(),r,s/d.width*2-1,1-n/d.height*2);o.hit=m,ge=performance.now(),m&&(r.clickEffect==="peak"&&N?o.burst={x:m.x,z:m.z,age:0}:r.clickEffect==="pulse"&&(K.length>=$e&&K.shift(),K.push({x:m.x,z:m.z,age:0})))},at=()=>{D.inside=!1,D.pending=!1,ge=0},Ge=t=>{t.pointerType==="touch"&&(at(),ne())},_t=()=>{at(),ne()},Pt=()=>{document.hidden?Xe():ne()},Dt=new ResizeObserver(St);Dt.observe(ve);const Bt=new IntersectionObserver(t=>{Ee=t.some(r=>r.intersectionRatio>=Gt),Ee?ne():(at(),Xe())},{threshold:Gt});Bt.observe(ve);const ae=We?.current??window,It=We?.current??document.documentElement;ae.addEventListener("pointermove",Ct,{passive:!0}),ae.addEventListener("pointerdown",At,{passive:!0}),ae.addEventListener("pointerup",Ge,{passive:!0}),ae.addEventListener("pointercancel",Ge,{passive:!0}),It.addEventListener("pointerleave",_t),document.addEventListener("visibilitychange",Pt);const Nt=()=>{if(!e.isContextLost()){if(!He&&!mt()){requestAnimationFrame(Nt);return}Qe().forEach(t=>e.deleteProgram(t.program))}},Ot=()=>{Et||(Et=!0,Xe(),Ye.current=null,Dt.disconnect(),Bt.disconnect(),ae.removeEventListener("pointermove",Ct),ae.removeEventListener("pointerdown",At),ae.removeEventListener("pointerup",Ge),ae.removeEventListener("pointercancel",Ge),It.removeEventListener("pointerleave",_t),document.removeEventListener("visibilitychange",Pt),P.removeEventListener("webglcontextlost",pt),P.removeEventListener("webglcontextrestored",xt),[Oe,...ze.flat()].forEach(t=>{t.texture&&e.deleteTexture(t.texture),t.depth&&e.deleteRenderbuffer(t.depth),e.deleteFramebuffer(t.framebuffer)}),N?.forEach(t=>{e.deleteTexture(t.texture),e.deleteFramebuffer(t.framebuffer)}),e.deleteTexture(Se),e.deleteVertexArray(gt),F.texture&&e.deleteTexture(F.texture),F.heights&&e.deleteTexture(F.heights),e.deleteFramebuffer(F.framebuffer),Nt())};return St(),Ye.current=ne,()=>{Ot();const t=()=>{Ie.current=0,!P.isConnected&&!e.isContextLost()&&e.getExtension("WEBGL_lose_context")?.loseContext()};P.isConnected?Ie.current=requestAnimationFrame(t):t()}},[so,We]),ue.useEffect(()=>{Ye.current?.()}),kt.jsx("div",{ref:st,className:`topography-container ${lo}`.trim(),style:co,children:kt.jsx("canvas",{ref:ft,className:"topography-canvas","aria-hidden":"true"})})};export{jo as default};
