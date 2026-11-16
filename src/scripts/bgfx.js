/* Slowly drifting warm mesh gradient behind the beige bands (header, page intros, footer).
   One continuous field in page coordinates, so the header and the intro below it read as one surface.
   With a mouse, a soft light follows the cursor and gently pushes the colour fields aside.
   Rendered small and scaled up: the gradient is soft, so this costs little. Grain is a static CSS layer. */
(() => {
  const els = [...document.querySelectorAll('.bg-warm, .warm-split')];
  if (!els.length) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SCALE = 0.4; // canvas pixels per CSS pixel

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;
uniform vec2 uRes;uniform vec2 uOff;uniform float uS;uniform float uT;
uniform vec2 uMouse;uniform float uMs;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
void main(){
  vec2 px=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y);
  vec2 page=uOff+px*uS;
  vec2 dm=page-uMouse;
  float glow=exp(-dot(dm,dm)/(2.*320.*320.))*uMs;
  vec2 p=page/820.;
  p+=normalize(dm+.001)*glow*.09;
  vec3 base=vec3(.914,.878,.839);
  vec3 light=vec3(.984,.973,.953);
  vec3 shade=vec3(.859,.812,.757);
  vec3 blush=vec3(.925,.851,.800);
  float t=uT;
  float a=fbm(p*.75+vec2(t*.025,-t*.018));
  float b=fbm(p*.9+vec2(-t*.02,t*.026)+7.3);
  float d=fbm(p*.6+vec2(t*.012,t*.015)+3.1);
  vec3 c=base;
  c=mix(c,light,smoothstep(.30,.58,a));
  c=mix(c,blush,smoothstep(.50,.76,b)*.8);
  c=mix(c,shade,smoothstep(.54,.80,d)*.75);
  c=mix(c,vec3(.992,.984,.969),glow*.85);
  gl_FragColor=vec4(c,1.);
}`;

  const items = [];
  const make = (el) => {
    const cv = document.createElement('canvas');
    cv.className = 'bgfx-c';
    cv.setAttribute('aria-hidden', 'true');
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (k) => gl.getUniformLocation(pr, k);
    el.classList.add('bgfx');
    el.prepend(cv);
    return { el, cv, gl, uRes: u('uRes'), uOff: u('uOff'), uS: u('uS'), uT: u('uT'), uMouse: u('uMouse'), uMs: u('uMs'), visible: false, ox: 0, oy: 0 };
  };

  const measure = (it) => {
    const r = it.cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * SCALE));
    const h = Math.max(1, Math.round(r.height * SCALE));
    if (it.cv.width !== w || it.cv.height !== h) { it.cv.width = w; it.cv.height = h; }
    it.ox = r.left + scrollX;
    it.oy = r.top + scrollY;
  };

  // Cursor in page coordinates, eased so the light trails the pointer softly.
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, ts: 0 };
  let cx = -1, cy = -1;
  const track = () => { if (cx >= 0) { mouse.tx = cx + scrollX; mouse.ty = cy + scrollY; } };
  if (finePointer && !reduce) {
    addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      cx = e.clientX; cy = e.clientY; track();
      if (mouse.ts === 0) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      mouse.ts = 1;
    }, { passive: true });
    addEventListener('scroll', track, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { mouse.ts = 0; });
  }

  const draw = (it, t) => {
    const { gl } = it;
    gl.viewport(0, 0, it.cv.width, it.cv.height);
    gl.uniform2f(it.uRes, it.cv.width, it.cv.height);
    gl.uniform2f(it.uOff, it.ox, it.oy);
    gl.uniform1f(it.uS, 1 / SCALE);
    gl.uniform1f(it.uT, t);
    gl.uniform2f(it.uMouse, mouse.x, mouse.y);
    gl.uniform1f(it.uMs, mouse.s);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const t0 = performance.now() - 40000; // start mid-motion, not at a neutral frame
  const now = () => (reduce ? 40 : (performance.now() - t0) / 1000);
  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;
    mouse.s += (mouse.ts - mouse.s) * 0.04;
    const t = now();
    items.forEach((it) => { if (it.visible) draw(it, t); });
  };

  els.forEach((el) => { const it = make(el); if (it) items.push(it); });
  if (!items.length) return;
  items.forEach(measure);
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    const it = items.find((i) => i.el === e.target);
    if (it) { it.visible = e.isIntersecting; if (it.visible) draw(it, now()); }
  }));
  items.forEach((it) => io.observe(it.el));
  const ro = new ResizeObserver(() => items.forEach((it) => { measure(it); draw(it, now()); }));
  items.forEach((it) => ro.observe(it.el));
  if (!reduce) raf = requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(loop);
  });
})();
