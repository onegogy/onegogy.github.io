(function () {
  const ASPECT  = 767 / 958; // photo ratio w/h
  const GAP     = 20;        // gap from nav and eyebrow
  const MIN_H   = 400;       // minimum card height

  const style = document.createElement('style');
  style.textContent = `
    #tc-wrap {
      position: absolute;
      right: max(32px, calc((100% - 1160px) / 2));
      perspective: 1200px;
      z-index: 3;
      pointer-events: all;
    }
    #tc-inner {
      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;
      border-radius: 28px;
      overflow: hidden;
      will-change: transform;
      box-shadow: 0 20px 80px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.08);
    }
    #tc-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    #tc-caption {
      pointer-events: none;
      position: absolute;
      border-radius: 4px;
      background: #fff;
      padding: 4px 10px;
      font-size: 11px;
      color: #2d2d2d;
      opacity: 0;
      z-index: 10;
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    @media (max-width: 768px) {
      #tc-inner { border-radius: 16px; }
      #tc-caption { display: none; }
    }
  `;
  document.head.appendChild(style);

  const hero = document.querySelector('.hero');
  if (!hero) return;

  hero.insertAdjacentHTML('beforeend', `
    <div id="tc-wrap">
      <div id="tc-inner">
        <img id="tc-img" src="photo.png" alt="Egor Krasnov" />
      </div>
      <div id="tc-caption">Egor Krasnov</div>
    </div>
  `);

  const wrap    = document.getElementById('tc-wrap');
  const inner   = document.getElementById('tc-inner');
  const caption = document.getElementById('tc-caption');

  function resize() {
    const nav     = document.querySelector('nav');
    const eyebrow = document.querySelector('.hero-eyebrow');
    if (!nav || !eyebrow) return;

    const navH        = nav.offsetHeight;
    const heroRect    = hero.getBoundingClientRect();
    const heroScrollTop = heroRect.top + window.scrollY; // top of hero relative to document
    const eyeRect     = eyebrow.getBoundingClientRect();
    const eyeTop      = eyeRect.top + window.scrollY; // eyebrow top relative to document

    const cardTop    = navH + GAP - heroScrollTop; // relative to hero
    const cardBottom = eyeTop - GAP - heroScrollTop;
    const h = Math.max(cardBottom - cardTop, MIN_H);
    const w = Math.round(h * ASPECT);

    wrap.style.top    = cardTop + 'px';
    wrap.style.width  = w + 'px';
    wrap.style.height = h + 'px';
  }

  // Run after layout settles
  requestAnimationFrame(() => { resize(); requestAnimationFrame(resize); });
  window.addEventListener('resize', resize);

  // Tilt logic
  const AMPLITUDE   = 12;
  const SCALE_HOVER = 1.04;
  let curRotX = 0, curRotY = 0, curScale = 1;
  let tgtRotX = 0, tgtRotY = 0, tgtScale = 1;
  let raf = null;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function tick() {
    curRotX = lerp(curRotX, tgtRotX, 0.1);
    curRotY = lerp(curRotY, tgtRotY, 0.1);
    curScale = lerp(curScale, tgtScale, 0.1);
    inner.style.transform = `rotateX(${curRotX}deg) rotateY(${curRotY}deg) scale(${curScale})`;
    inner.style.boxShadow = `0 ${20+(curScale-1)*60}px ${80+(curScale-1)*80}px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.07)`;
    if (
      Math.abs(curRotX - tgtRotX) > 0.02 ||
      Math.abs(curRotY - tgtRotY) > 0.02 ||
      Math.abs(curScale - tgtScale) > 0.002
    ) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = null;
    }
  }

  function go() { if (!raf) raf = requestAnimationFrame(tick); }

  wrap.addEventListener('mousemove', e => {
    const rect = inner.getBoundingClientRect();
    const ox = e.clientX - rect.left - rect.width / 2;
    const oy = e.clientY - rect.top - rect.height / 2;
    tgtRotX = (oy / (rect.height / 2)) * -AMPLITUDE;
    tgtRotY = (ox / (rect.width / 2)) * AMPLITUDE;
    caption.style.left = (e.clientX - rect.left) + 'px';
    caption.style.top  = (e.clientY - rect.top)  + 'px';
    go();
  });

  wrap.addEventListener('mouseenter', () => { tgtScale = SCALE_HOVER; caption.style.opacity = '1'; go(); });
  wrap.addEventListener('mouseleave', () => { tgtRotX = 0; tgtRotY = 0; tgtScale = 1; caption.style.opacity = '0'; go(); });

  wrap.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    const rect = inner.getBoundingClientRect();
    tgtRotX = ((t.clientY - rect.top - rect.height/2) / (rect.height/2)) * -(AMPLITUDE * 0.6);
    tgtRotY = ((t.clientX - rect.left - rect.width/2) / (rect.width/2)) * (AMPLITUDE * 0.6);
    go();
  }, { passive: false });

  wrap.addEventListener('touchend', () => { tgtRotX = 0; tgtRotY = 0; tgtScale = 1; go(); });
})();
