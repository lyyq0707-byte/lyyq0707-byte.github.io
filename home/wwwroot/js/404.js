(() => {
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isZh = () => root.lang === 'zh-CN';
  const t = (en, zh) => (isZh() ? zh : en);

  // ========== 语言切换 ==========
  document.getElementById('langToggle').addEventListener('click', () => {
    const next = isZh() ? 'en' : 'zh';
    root.lang = next === 'zh' ? 'zh-CN' : 'en';
    try { localStorage.setItem('lang', next); } catch (e) {}
  });

  // ========== 提示框 ==========
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(msg, ms = 2200) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  // ========== 指针位置（星空视差 + 粒子互动共用） ==========
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, active: false, coarse: matchMedia('(pointer: coarse)').matches };
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
    parallax.tx = (e.clientX / innerWidth - 0.5) * 2;
    parallax.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  addEventListener('pointerleave', () => { pointer.active = false; });
  document.addEventListener('pointerout', (e) => { if (!e.relatedTarget) pointer.active = false; });
  // 手机：用陀螺仪倾斜做视差
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    parallax.tx = Math.max(-1, Math.min(1, e.gamma / 30));
    parallax.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  }, { passive: true });

  // ========== 星空 ==========
  const starCanvas = document.getElementById('stars');
  const sctx = starCanvas.getContext('2d');
  let stars = [];
  let dpr = 1;

  function sizeCanvas(c) {
    const r = c.getBoundingClientRect();
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    return r;
  }

  function buildStars() {
    const count = Math.round(Math.min(260, (innerWidth * innerHeight) / 5200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      z: Math.random() * 0.9 + 0.1, // 越大越近
      tw: Math.random() * Math.PI * 2
    }));
  }

  function drawStars(time) {
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of stars) {
      const px = s.x - parallax.x * 40 * s.z;
      const py = s.y - parallax.y * 40 * s.z;
      const x = ((px % innerWidth) + innerWidth) % innerWidth;
      const y = ((py % innerHeight) + innerHeight) % innerHeight;
      const twinkle = reduceMotion ? 1 : 0.6 + Math.sin(time / 700 + s.tw) * 0.4;
      sctx.globalAlpha = (0.25 + s.z * 0.75) * twinkle;
      sctx.fillStyle = '#ffffff';
      const r = s.z * 1.6;
      sctx.beginPath();
      sctx.arc(x, y, r, 0, Math.PI * 2);
      sctx.fill();
      if (!reduceMotion) s.y += s.z * 0.06; // 缓慢下落
    }
    sctx.globalAlpha = 1;
  }

  // ========== 粒子组成的 404 ==========
  const pCanvas = document.getElementById('particles');
  const pctx = pCanvas.getContext('2d');
  let particles = [];
  let pRect = pCanvas.getBoundingClientRect();
  const palette = [[139, 92, 246], [34, 211, 238], [244, 114, 182]];

  function lerpColor(tval) {
    const seg = tval * (palette.length - 1);
    const i = Math.min(Math.floor(seg), palette.length - 2);
    const f = seg - i;
    const a = palette[i], b = palette[i + 1];
    return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(a[1] + (b[1] - a[1]) * f)},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
  }

  function buildParticles() {
    pRect = sizeCanvas(pCanvas);
    const w = pRect.width, h = pRect.height;
    const off = document.createElement('canvas');
    off.width = Math.round(w);
    off.height = Math.round(h);
    const octx = off.getContext('2d');
    const fontSize = Math.min(h * 0.95, w * 0.42);
    octx.fillStyle = '#fff';
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.font = `700 ${fontSize}px "Space Grotesk", "Segoe UI", sans-serif`;
    octx.fillText('404', w / 2, h / 2 + fontSize * 0.04);

    const gap = w < 520 ? 4 : 5;
    const data = octx.getImageData(0, 0, off.width, off.height).data;
    const old = particles;
    particles = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (data[(y * off.width + x) * 4 + 3] > 128) {
          const prev = old[particles.length];
          particles.push({
            hx: x, hy: y,
            x: prev ? prev.x : Math.random() * w,
            y: prev ? prev.y : Math.random() * h,
            vx: 0, vy: 0,
            size: gap * 0.55 + Math.random() * gap * 0.25,
            color: lerpColor(x / w)
          });
        }
      }
    }
  }

  function explode(cx, cy, power = 14) {
    for (const p of particles) {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy) || 1;
      const f = power * (0.5 + Math.random());
      p.vx += (dx / d) * f + (Math.random() - 0.5) * 6;
      p.vy += (dy / d) * f + (Math.random() - 0.5) * 6;
    }
  }

  pCanvas.addEventListener('click', (e) => {
    explode(e.clientX - pRect.left, e.clientY - pRect.top);
  });

  function drawParticles() {
    pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pctx.clearRect(0, 0, pRect.width, pRect.height);
    const mx = pointer.x - pRect.left;
    const my = pointer.y - pRect.top;
    const radius = pointer.coarse ? 70 : 90;
    for (const p of particles) {
      // 弹簧回到原位
      p.vx += (p.hx - p.x) * 0.035;
      p.vy += (p.hy - p.y) * 0.035;
      // 被指针推开
      if (pointer.active) {
        const dx = p.x - mx, dy = p.y - my;
        const d2 = dx * dx + dy * dy;
        if (d2 < radius * radius) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / radius) * 4.2;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      }
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;
      pctx.fillStyle = p.color;
      pctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  // ========== 彩带 ==========
  const cCanvas = document.getElementById('confetti');
  const cctx = cCanvas.getContext('2d');
  let confetti = [];
  const confettiColors = ['#8b5cf6', '#22d3ee', '#f472b6', '#facc15', '#34d399'];

  function burstConfetti(x, y, n = 160) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 9;
      confetti.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 6,
        w: 6 + Math.random() * 6,
        h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: confettiColors[i % confettiColors.length],
        life: 1
      });
    }
  }

  function drawConfetti() {
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!confetti.length) return;
    for (const c of confetti) {
      c.vy += 0.22;
      c.vx *= 0.99;
      c.x += c.vx;
      c.y += c.vy;
      c.rot += c.vr;
      c.life -= 0.006;
      cctx.save();
      cctx.globalAlpha = Math.max(c.life, 0);
      cctx.translate(c.x, c.y);
      cctx.rotate(c.rot);
      cctx.fillStyle = c.color;
      cctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      cctx.restore();
    }
    confetti = confetti.filter((c) => c.life > 0 && c.y < innerHeight + 40);
  }

  // ========== 小游戏：找回丢失的页面 ==========
  const lostPage = document.getElementById('lostPage');
  const gameBtn = document.getElementById('gameBtn');
  const scoreboard = document.getElementById('scoreboard');
  const scoreEl = document.getElementById('score');
  const GOAL = 5;
  let score = 0;
  let playing = false;
  let wanderTimer;
  let pagePos = { x: 0, y: 0 };
  let lastDodge = 0;

  function placePage(x, y) {
    const maxX = innerWidth - 64, maxY = innerHeight - 84;
    pagePos.x = Math.max(8, Math.min(maxX, x));
    pagePos.y = Math.max(64, Math.min(maxY, y));
    lostPage.style.transform = `translate(${pagePos.x}px, ${pagePos.y}px)`;
  }
  const randomPlace = () => placePage(Math.random() * innerWidth, 64 + Math.random() * (innerHeight - 140));

  function wander() {
    clearTimeout(wanderTimer);
    randomPlace();
    // 越接近成功，跑得越快
    wanderTimer = setTimeout(wander, Math.max(700, 1900 - score * 230));
  }

  function startGame() {
    playing = true;
    score = 0;
    scoreEl.textContent = '0';
    lostPage.hidden = false;
    scoreboard.hidden = false;
    gameBtn.setAttribute('aria-pressed', 'true');
    placePage(innerWidth / 2 - 28, innerHeight / 2);
    requestAnimationFrame(wander);
    showToast(t('Catch the runaway page 5 times!', '抓住逃跑的页面 5 次！'));
  }

  function stopGame() {
    playing = false;
    clearTimeout(wanderTimer);
    lostPage.hidden = true;
    scoreboard.hidden = true;
    gameBtn.setAttribute('aria-pressed', 'false');
  }

  gameBtn.addEventListener('click', () => (playing ? stopGame() : startGame()));

  lostPage.addEventListener('click', () => {
    if (!playing) return;
    score += 1;
    scoreEl.textContent = String(score);
    lostPage.classList.remove('caught');
    void lostPage.offsetWidth;
    lostPage.classList.add('caught');
    const cx = pagePos.x + 28, cy = pagePos.y + 35;
    burstConfetti(cx, cy, 24);
    if (score >= GOAL) {
      burstConfetti(innerWidth / 2, innerHeight / 2, 260);
      explode(pRect.width / 2, pRect.height / 2, 22);
      showToast(t('🎉 You found it! …but there’s still nothing here.', '🎉 找到了！……可惜这里还是什么都没有。'), 3600);
      stopGame();
      return;
    }
    const msgs = [
      ['Got it! Keep going', '抓到了！继续'],
      ['Nice reflexes!', '反应真快！'],
      ['It’s getting nervous…', '它开始紧张了……'],
      ['One more!', '最后一次！']
    ];
    const m = msgs[Math.min(score - 1, msgs.length - 1)];
    showToast(`${t(m[0], m[1])} · ${score}/${GOAL}`, 1400);
    wander();
  });

  // 鼠标靠近时躲开（触屏上不躲，否则太难）
  addEventListener('pointermove', (e) => {
    if (!playing || e.pointerType !== 'mouse') return;
    const now = performance.now();
    if (now - lastDodge < 260) return;
    const cx = pagePos.x + 28, cy = pagePos.y + 35;
    const dx = cx - e.clientX, dy = cy - e.clientY;
    const d = Math.hypot(dx, dy);
    if (d < 95 && Math.random() < 0.55) {
      lastDodge = now;
      const k = 150 / (d || 1);
      placePage(pagePos.x + dx * k, pagePos.y + dy * k);
    }
  }, { passive: true });

  // ========== 返回按钮（不提供任何其他页面的链接） ==========
  document.getElementById('backBtn').addEventListener('click', () => {
    if (history.length > 1 && document.referrer) history.back();
    else {
      explode(pRect.width / 2, pRect.height / 2, 18);
      showToast(t('There’s nowhere to go back to… 🛸', '没有上一页可以回去了…… 🛸'));
    }
  });

  // ========== 尺寸与动画循环 ==========
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    sizeCanvas(starCanvas);
    sizeCanvas(cCanvas);
    buildStars();
    buildParticles();
  }
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  function frame(time) {
    parallax.x += (parallax.tx - parallax.x) * 0.06;
    parallax.y += (parallax.ty - parallax.y) * 0.06;
    pRect = pCanvas.getBoundingClientRect();
    drawStars(time);
    drawParticles();
    drawConfetti();
    requestAnimationFrame(frame);
  }

  // 等字体加载后再生成粒子，确保“404”的字形正确
  const ready = document.fonts && document.fonts.load ? document.fonts.load('700 100px "Space Grotesk"').catch(() => {}) : Promise.resolve();
  resize();
  ready.then(() => {
    buildParticles();
    if (!reduceMotion) explode(pRect.width / 2, pRect.height / 2, 30); // 入场：从四散聚合成 404
  });
  requestAnimationFrame(frame);
})();
