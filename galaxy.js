/**
 * Galaxy Background — vanilla JS/WebGL
 * Converted from react-bits Galaxy component (DavidHDev/react-bits)
 */
function createGalaxy(container, opts) {
  var cfg = Object.assign({
    focal:               [0.5, 0.5],
    rotation:            [1.0, 0.0],
    starSpeed:           0.5,
    density:             1.0,
    hueShift:            140,
    speed:               1.0,
    glowIntensity:       0.3,
    saturation:          0.0,
    mouseRepulsion:      true,
    repulsionStrength:   2.0,
    twinkleIntensity:    0.3,
    rotationSpeed:       0.1,
    autoCenterRepulsion: 0.0,
    transparent:         false,
    mouseInteraction:    true,
    disableAnimation:    false,
  }, opts || {});

  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(canvas);

  var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) { console.error('WebGL not supported'); return function(){}; }

  if (cfg.transparent) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  } else {
    gl.clearColor(0, 0, 0, 1);
  }

  var vertSrc = [
    'attribute vec2 position;',
    'attribute vec2 uv;',
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = vec4(position, 0.0, 1.0);',
    '}'
  ].join('\n');

  var fragSrc = [
    'precision highp float;',
    'uniform float uTime;',
    'uniform vec3  uResolution;',
    'uniform vec2  uFocal;',
    'uniform vec2  uRotation;',
    'uniform float uStarSpeed;',
    'uniform float uDensity;',
    'uniform float uHueShift;',
    'uniform float uSpeed;',
    'uniform vec2  uMouse;',
    'uniform float uGlowIntensity;',
    'uniform float uSaturation;',
    'uniform int   uMouseRepulsion;',
    'uniform float uTwinkleIntensity;',
    'uniform float uRotationSpeed;',
    'uniform float uRepulsionStrength;',
    'uniform float uMouseActiveFactor;',
    'uniform float uAutoCenterRepulsion;',
    'uniform int   uTransparent;',
    'varying vec2 vUv;',

    '#define NUM_LAYER 4.0',
    '#define STAR_COLOR_CUTOFF 0.2',
    '#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)',
    '#define PERIOD 3.0',

    'float Hash21(vec2 p) {',
    '  p = fract(p * vec2(123.34, 456.21));',
    '  p += dot(p, p + 45.32);',
    '  return fract(p.x * p.y);',
    '}',

    'float tri(float x) {',
    '  return abs(fract(x) * 2.0 - 1.0);',
    '}',

    'float tris(float x) {',
    '  float t = fract(x);',
    '  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));',
    '}',

    'float trisn(float x) {',
    '  float t = fract(x);',
    '  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;',
    '}',

    'vec3 hsv2rgb(vec3 c) {',
    '  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);',
    '  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);',
    '  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);',
    '}',

    'float Star(vec2 uv, float flare) {',
    '  float d = length(uv);',
    '  float m = (0.05 * uGlowIntensity) / d;',
    '  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));',
    '  m += rays * flare * uGlowIntensity;',
    '  uv *= MAT45;',
    '  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));',
    '  m += rays * 0.3 * flare * uGlowIntensity;',
    '  m *= smoothstep(1.0, 0.2, d);',
    '  return m;',
    '}',

    'vec3 StarLayer(vec2 uv) {',
    '  vec3 col = vec3(0.0);',
    '  vec2 gv = fract(uv) - 0.5;',
    '  vec2 id = floor(uv);',
    '  for (int y = -1; y <= 1; y++) {',
    '    for (int x = -1; x <= 1; x++) {',
    '      vec2 offset = vec2(float(x), float(y));',
    '      vec2 si     = id + vec2(float(x), float(y));',
    '      float seed  = Hash21(si);',
    '      float size  = fract(seed * 345.32);',
    '      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));',
    '      float flareSize  = smoothstep(0.9, 1.0, size) * glossLocal;',
    '      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;',
    '      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;',
    '      float grn = min(red, blu) * seed;',
    '      vec3 base = vec3(red, grn, blu);',
    '      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;',
    '      hue = fract(hue + uHueShift / 360.0);',
    '      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;',
    '      float val = max(max(base.r, base.g), base.b);',
    '      base = hsv2rgb(vec3(hue, sat, val));',
    '      vec2 pad = vec2(',
    '        tris(seed * 34.0  + uTime * uSpeed / 10.0),',
    '        tris(seed * 38.0  + uTime * uSpeed / 30.0)',
    '      ) - 0.5;',
    '      float star = Star(gv - offset - pad, flareSize);',
    '      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;',
    '      twinkle = mix(1.0, twinkle, uTwinkleIntensity);',
    '      star *= twinkle;',
    '      col += star * size * base;',
    '    }',
    '  }',
    '  return col;',
    '}',

    'void main() {',
    '  vec2 focalPx = uFocal * uResolution.xy;',
    '  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;',
    '  vec2 mouseNorm = uMouse - vec2(0.5);',
    '  if (uAutoCenterRepulsion > 0.0) {',
    '    vec2 centerUV = vec2(0.0, 0.0);',
    '    float centerDist = length(uv - centerUV);',
    '    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));',
    '    uv += repulsion * 0.05;',
    '  } else if (uMouseRepulsion == 1) {',
    '    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;',
    '    float mouseDist = length(uv - mousePosUV);',
    '    vec2 repulsion  = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));',
    '    uv += repulsion * 0.05 * uMouseActiveFactor;',
    '  } else {',
    '    uv += mouseNorm * 0.1 * uMouseActiveFactor;',
    '  }',
    '  float autoRotAngle = uTime * uRotationSpeed;',
    '  mat2 autoRot = mat2(',
    '    cos(autoRotAngle), -sin(autoRotAngle),',
    '    sin(autoRotAngle),  cos(autoRotAngle)',
    '  );',
    '  uv = autoRot * uv;',
    '  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;',
    '  vec3 col = vec3(0.0);',
    '  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {',
    '    float depth = fract(i + uStarSpeed * uSpeed);',
    '    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);',
    '    float fade  = depth * smoothstep(1.0, 0.9, depth);',
    '    col += StarLayer(uv * scale + i * 453.32) * fade;',
    '  }',
    '  if (uTransparent == 1) {',
    '    float alpha = length(col);',
    '    alpha = smoothstep(0.0, 0.3, alpha);',
    '    alpha = min(alpha, 1.0);',
    '    gl_FragColor = vec4(col, alpha);',
    '  } else {',
    '    gl_FragColor = vec4(col, 1.0);',
    '  }',
    '}'
  ].join('\n');

  function compileShader(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  var vert = compileShader(gl.VERTEX_SHADER,   vertSrc);
  var frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
  var prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  var positions = new Float32Array([-1, -1,  3, -1, -1,  3]);
  var uvs       = new Float32Array([ 0,  0,  2,  0,  0,  2]);

  function makeBuffer(data, attrib) {
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, attrib);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return buf;
  }
  makeBuffer(positions, 'position');
  makeBuffer(uvs,       'uv');

  var U = {};
  ['uTime','uResolution','uFocal','uRotation','uStarSpeed','uDensity',
   'uHueShift','uSpeed','uMouse','uGlowIntensity','uSaturation',
   'uMouseRepulsion','uTwinkleIntensity','uRotationSpeed','uRepulsionStrength',
   'uMouseActiveFactor','uAutoCenterRepulsion','uTransparent'
  ].forEach(function(name) { U[name] = gl.getUniformLocation(prog, name); });

  gl.uniform2fv(U.uFocal,               new Float32Array(cfg.focal));
  gl.uniform2fv(U.uRotation,            new Float32Array(cfg.rotation));
  gl.uniform1f (U.uDensity,             cfg.density);
  gl.uniform1f (U.uHueShift,            cfg.hueShift);
  gl.uniform1f (U.uSpeed,               cfg.speed);
  gl.uniform1f (U.uGlowIntensity,       cfg.glowIntensity);
  gl.uniform1f (U.uSaturation,          cfg.saturation);
  gl.uniform1i (U.uMouseRepulsion,      cfg.mouseRepulsion ? 1 : 0);
  gl.uniform1f (U.uTwinkleIntensity,    cfg.twinkleIntensity);
  gl.uniform1f (U.uRotationSpeed,       cfg.rotationSpeed);
  gl.uniform1f (U.uRepulsionStrength,   cfg.repulsionStrength);
  gl.uniform1f (U.uAutoCenterRepulsion, cfg.autoCenterRepulsion);
  gl.uniform1i (U.uTransparent,         cfg.transparent ? 1 : 0);
  gl.uniform2fv(U.uMouse,               new Float32Array([0.5, 0.5]));
  gl.uniform1f (U.uMouseActiveFactor,   0.0);

  function resize() {
    canvas.width  = container.offsetWidth;
    canvas.height = container.offsetHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform3f(U.uResolution, canvas.width, canvas.height, canvas.width / canvas.height);
  }
  window.addEventListener('resize', resize);
  resize();

  var targetMouse = { x: 0.5, y: 0.5 };
  var smoothMouse = { x: 0.5, y: 0.5 };
  var targetActive = 0.0;
  var smoothActive = 0.0;

  function onMouseMove(e) {
    var rect = container.getBoundingClientRect();
    targetMouse.x = (e.clientX - rect.left) / rect.width;
    targetMouse.y = 1.0 - (e.clientY - rect.top) / rect.height;
    targetActive  = 1.0;
  }
  function onMouseLeave() { targetActive = 0.0; }

  if (cfg.mouseInteraction) {
    container.addEventListener('mousemove',  onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
  }

  var rafId;
  var lerpFactor = 0.05;

  function update(t) {
    rafId = requestAnimationFrame(update);
    var ts = t * 0.001;

    if (!cfg.disableAnimation) {
      gl.uniform1f(U.uTime,      ts);
      gl.uniform1f(U.uStarSpeed, (ts * cfg.starSpeed) / 10.0);
    }

    smoothMouse.x += (targetMouse.x - smoothMouse.x) * lerpFactor;
    smoothMouse.y += (targetMouse.y - smoothMouse.y) * lerpFactor;
    smoothActive  += (targetActive  - smoothActive)  * lerpFactor;

    gl.uniform2fv(U.uMouse,            new Float32Array([smoothMouse.x, smoothMouse.y]));
    gl.uniform1f (U.uMouseActiveFactor, smoothActive);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  rafId = requestAnimationFrame(update);

  return function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    if (cfg.mouseInteraction) {
      container.removeEventListener('mousemove',  onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    }
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    var ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  };
}
