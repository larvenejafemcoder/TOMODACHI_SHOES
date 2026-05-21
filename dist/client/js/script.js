/* ==============================
   TOMODACHI SHOES — 機密保管庫
   GSAP + Lenis Engine
   ============================== */

// ==============================
// LOADING SCREEN SEQUENCE
// ==============================
(function initLoader() {
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loaderBar');
  const pct = document.getElementById('loaderPct');
  if (!loader) return;

  let progress = 0;

  function animateLoader() {
    if (progress >= 100) {
      loader.classList.add('hidden');
      document.body.style.overflow = '';
      initHeroAnimations();
      return;
    }

    // Fast start, slow end
    const increment = progress < 30 ? 3 + Math.random() * 4 :
                      progress < 60 ? 2 + Math.random() * 3 :
                      progress < 85 ? 1 + Math.random() * 2 :
                      0.3 + Math.random() * 0.8;

    progress = Math.min(100, progress + increment);
    bar.style.width = progress + '%';
    pct.textContent = Math.floor(progress) + '%';

    const delay = progress < 85 ? 20 + Math.random() * 30 : 40 + Math.random() * 60;
    setTimeout(animateLoader, delay);
  }

  document.body.style.overflow = 'hidden';
  animateLoader();
})();

// ==============================
// GSAP HERO ANIMATIONS
// ==============================
function initHeroAnimations() {
  const heroLines = document.querySelectorAll('[data-lag]');
  heroLines.forEach(el => {
    const lag = parseFloat(el.getAttribute('data-lag')) || 0;
    gsap.fromTo(el,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, delay: 0.3 + lag, ease: 'power3.out' }
    );
  });
}

// ==============================
// CURSOR GLOW TRACKING
// ==============================
(function initCursorGlow() {
  const glow = document.getElementById('cursorGlow');
  if (!glow) return;

  document.addEventListener('mousemove', (e) => {
    gsap.to(glow, {
      x: e.clientX,
      y: e.clientY,
      duration: 0.6,
      ease: 'power2.out'
    });
  });
})();

// ==============================
// LENIS SMOOTH SCROLL
// ==============================
(function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: true,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // Sync GSAP ScrollTrigger with Lenis
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Expose lenis globally for other scripts
  window.lenis = lenis;

  // Smooth nav anchor clicks
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80, duration: 1.5 });
      }
      document.getElementById('mobileNavPanel')?.classList.add('hidden');
    });
  });
})();

// ==============================
// NAV & METRO ACTIVE STATE
// ==============================
(function initNavScroll() {
  const navLinks = document.querySelectorAll('.ts-nav-link[data-section]');

  function updateActiveNav() {
    const scrollPos = window.lenis ? window.lenis.actualScroll : window.scrollY;
    const sections = document.querySelectorAll('section[id]');

    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      const bottom = top + section.offsetHeight;
      if (scrollPos >= top && scrollPos < bottom) {
        current = section.id;
      }
    });

    navLinks.forEach(link => {
      const section = link.getAttribute('data-section');
      if (section === current) {
        link.style.color = '#A855F7';
      } else {
        link.style.color = '';
      }
    });
  }

  if (window.lenis) {
    window.lenis.on('scroll', updateActiveNav);
  } else {
    window.addEventListener('scroll', updateActiveNav);
  }
})();

// ==============================
// MOBILE NAV TOGGLE
// ==============================
document.getElementById('mobileNavToggle')?.addEventListener('click', function() {
  document.getElementById('mobileNavPanel')?.classList.toggle('hidden');
});

// ==============================
// DOSSIER: 2D SHOE ROTATION
// ==============================
(function initDossierShoe() {
  const shoeContainer = document.getElementById('dossierShoe');
  const shoeImgs = document.querySelectorAll('.ts-shoe-img');
  if (!shoeContainer || !shoeImgs.length) return;

  const shoeAssets = [
    'assets/images/shoe4.svg',
    'assets/images/shoe5.svg',
    'assets/images/shoe6.svg',
    'assets/images/shoe7.svg',
    'assets/images/shoe8.svg'
  ];

  function setShoeImage(index) {
    shoeImgs.forEach((img, i) => {
      img.classList.toggle('active', i === index);
      img.classList.toggle('hidden', i !== index);
    });
  }

  function getScrollProgress() {
    const section = document.querySelector('.ts-dossier');
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    const sHeight = section.offsetHeight;
    const vHeight = window.innerHeight;
    const stickyArea = sHeight - vHeight;
    if (stickyArea <= 0) return 0;
    return Math.max(0, Math.min(1, (-rect.top) / stickyArea));
  }

  function updateShoeRotation(progress) {
    const degrees = progress * 360;
    shoeContainer.style.transform = `rotateY(${degrees}deg) translateZ(${Math.sin(progress * Math.PI * 2) * 20}px)`;

    const normDeg = degrees % 360;
    let idx = 0;
    if (normDeg >= 72) idx = 1;
    if (normDeg >= 144) idx = 2;
    if (normDeg >= 216) idx = 3;
    if (normDeg >= 288) idx = 4;
    setShoeImage(idx);

    updateJpOverlay(progress);
  }

  const jpTexts = ['加速', '速度', '未来', '都市', '運動', '革新', '疾走', '風'];
  const jpOverlay = document.getElementById('dossierJp');

  function updateJpOverlay(progress) {
    if (!jpOverlay) return;
    const idx = Math.floor(progress * jpTexts.length) % jpTexts.length;
    jpOverlay.textContent = jpTexts[idx];
    jpOverlay.style.right = `${5 - (progress * 10)}%`;
    jpOverlay.style.opacity = 0.015 + (Math.sin(progress * Math.PI) * 0.02);
    jpOverlay.style.filter = `blur(${Math.abs(Math.sin(progress * jpTexts.length * Math.PI) * 0.5)}px)`;
  }

  setShoeImage(0);

  if (window.lenis) {
    window.lenis.on('scroll', () => {
      const p = getScrollProgress();
      updateShoeRotation(p);
    });
  } else {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateShoeRotation(getScrollProgress());
          ticking = false;
        });
        ticking = true;
      }
    });
  }
})();

// ==============================
// SCROLL PROGRESS BAR
// ==============================
(function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;

  function update() {
    const scrollTop = window.lenis ? window.lenis.actualScroll : window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const p = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = p + '%';
  }

  if (window.lenis) {
    window.lenis.on('scroll', update);
  } else {
    window.addEventListener('scroll', update);
  }
})();

// ==============================
// SUBWAY PARALLAX
// ==============================
(function initSubwayParallax() {
  const track = document.getElementById('scrollTrack1');
  if (!track) return;

  function update() {
    const offset = (window.lenis ? window.lenis.actualScroll : window.scrollY) * 0.3;
    track.style.transform = `translateX(${-offset}px)`;
  }

  if (window.lenis) {
    window.lenis.on('scroll', update);
  } else {
    window.addEventListener('scroll', update);
  }
})();

// ==============================
// SUBSCRIBE BUTTON
// ==============================
document.getElementById('subscribeBtn')?.addEventListener('click', function() {
  const input = document.getElementById('subscribeInput');
  if (input && input.value.trim()) {
    this.textContent = '✓ CONNECTED';
    this.style.background = '#059669';
    setTimeout(() => {
      this.innerHTML = 'CONNECT';
      this.style.background = '';
      input.value = '';
    }, 2000);
  }
});

// ==============================
// TERMINAL MODE (CTRL+SHIFT+J)
// ==============================
(function initTerminal() {
  const terminal = document.getElementById('terminal');
  const closeBtn = document.getElementById('terminalClose');
  const triggerBtn = document.getElementById('terminalTrigger');
  const cursor = document.getElementById('terminalCursor');
  const body = document.getElementById('terminalBody');

  function openTerminal() {
    terminal.classList.remove('hidden');
    if (cursor) {
      cursor.style.animation = 'cursorBlink 1s step-end infinite';
    }
  }

  function closeTerminal() {
    terminal.classList.add('hidden');
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
      e.preventDefault();
      if (terminal.classList.contains('hidden')) {
        openTerminal();
      } else {
        closeTerminal();
      }
    }
  });

  triggerBtn?.addEventListener('click', openTerminal);
  closeBtn?.addEventListener('click', closeTerminal);

  // Terminal command typing
  if (body && cursor) {
    const commands = [
      'access archive',
      'loading classified inventory...',
      'decrypting product database...',
      'Access granted. Welcome, operative.'
    ];

    document.addEventListener('keydown', (e) => {
      if (terminal.classList.contains('hidden')) return;
      if (e.key === 'Enter') {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.innerHTML = `<span class="terminal-prompt">></span> command not recognized. Try: help, archive, status`;
        body.appendChild(line);
        body.scrollTop = body.scrollHeight;
      }
      if (e.key === 'Escape') {
        closeTerminal();
      }
    });
  }
})();

// ==============================
// REGION SWITCHING
// ==============================
(function initRegionSwitching() {
  const buttons = document.querySelectorAll('.ts-region-btn');
  const regions = {
    tokyo: { label: '東京', city: 'TOKYO', badge: 'JP-TOKYO', hue: 270 },
    osaka: { label: '大阪', city: 'OSAKA', badge: 'JP-OSAKA', hue: 200 },
    seoul: { label: '서울', city: 'SEOUL', badge: 'KR-SEOUL', hue: 340 },
    shanghai: { label: '上海', city: 'SHANGHAI', badge: 'CN-SHANGHAI', hue: 40 },
  };

  let currentRegion = 'tokyo';

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRegion = btn.getAttribute('data-region');
      applyRegion(currentRegion);
    });
  });

  function applyRegion(region) {
    const data = regions[region];
    if (!data) return;

    // Update city name in hero
    const timeDisplay = document.getElementById('tsTime');
    if (timeDisplay) {
      timeDisplay.textContent = `${data.city} · ${getTimeString()}`;
    }

    // Update region badge
    const regionBadges = document.querySelectorAll('.ts-hero-stats .ts-stat:last-child .ts-stat-val');
    regionBadges.forEach(el => { el.textContent = data.badge; });

    // Shift accent color via CSS variable
    document.documentElement.style.setProperty('--region-hue', data.hue);
    document.documentElement.style.setProperty('--region-saturation', '80%');
    document.documentElement.style.setProperty('--region-lightness', '60%');

    // Subtle body transition
    document.body.style.transition = 'background 0.8s ease';
  }
})();

// ==============================
// DYNAMIC TIME SYSTEM
// ==============================
(function initTimeSystem() {
  const timeDisplay = document.getElementById('tsTime');
  if (!timeDisplay) return;

  function getTokyoTime() {
    const now = new Date();
    const tokyo = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now);
    return tokyo;
  }

  function getTimeString() {
    return getTokyoTime();
  }

  function updateTime() {
    if (timeDisplay) {
      const currentText = timeDisplay.textContent || '';
      const city = currentText.split(' · ')[0] || 'TOKYO';
      timeDisplay.textContent = `${city} · ${getTimeString()}`;
    }
    requestAnimationFrame(() => setTimeout(updateTime, 10000));
  }

  updateTime();

  // Day/night palette switching
  function checkDayNight() {
    const hour = new Date().getUTCHours() + 9; // JST
    const isNight = hour < 6 || hour >= 18;
    const root = document.documentElement;

    if (isNight) {
      root.style.setProperty('--ts-purple', '#A855F7');
      root.style.setProperty('--ts-crimson', '#DC2626');
      root.style.setProperty('--ts-accent', '#FF2D55');
      root.style.setProperty('--ts-matte', '#F5F5F5');
    } else {
      root.style.setProperty('--ts-purple', '#7C3AED');
      root.style.setProperty('--ts-crimson', '#B91C1C');
      root.style.setProperty('--ts-accent', '#E11D48');
      root.style.setProperty('--ts-matte', '#F5F5F5');
    }
  }

  checkDayNight();
  setInterval(checkDayNight, 60000);
})();

// ==============================
// GSAP SCROLL-TRIGGERED ENTRANCES
// ==============================
(function initGsapEntrances() {
  gsap.registerPlugin(ScrollTrigger);

  // Tech cards stagger
  gsap.from('.ts-tech-card', {
    scrollTrigger: {
      trigger: '.ts-tech',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    y: 40,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out'
  });

  // Review cards
  gsap.from('.ts-review-card', {
    scrollTrigger: {
      trigger: '.ts-reviews',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    y: 30,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power3.out'
  });

  // Subway content
  gsap.from('.ts-subway-content > *', {
    scrollTrigger: {
      trigger: '.ts-subway',
      start: 'top 80%',
      toggleActions: 'play none none none'
    },
    y: 30,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    ease: 'power2.out'
  });
})();

// ==============================
// INITIAL LOAD
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.ts-shoe-img').forEach((img, i) => {
    img.classList.toggle('active', i === 0);
    img.classList.toggle('hidden', i !== 0);
  });
});
