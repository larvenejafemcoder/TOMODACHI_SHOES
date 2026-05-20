/* ==============================
   URBAN VELOCITY — 都市速度
   Scroll Engine & Interactions
   ============================== */

// --- Smooth scroll for nav links ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Close mobile nav
    document.getElementById('mobileNavPanel').classList.add('hidden');
  });
});

// --- Mobile nav toggle ---
document.getElementById('mobileNavToggle').addEventListener('click', function() {
  document.getElementById('mobileNavPanel').classList.toggle('hidden');
});

// ==============================
// PRODUCT SECTION: 2D SHOE IMAGE ROTATION
// ==============================

const shoeImages = [
  'assets/images/big-shoe1.png',
  'assets/images/big-shoe2.png',
  'assets/images/big-shoe3.png'
];

const shoe3d = document.getElementById('shoe3d');
const productShoeImgs = document.querySelectorAll('.shoe-product-img');

let currentShoeIndex = 0;

function setShoeImage(index, elements) {
  elements.forEach((img, i) => {
    img.classList.toggle('active', i === index);
    img.classList.toggle('hidden', i !== index);
  });
}

// ==============================
// SCROLL-DRIVEN 360° SHOE ROTATION
// ==============================

function getScrollProgress() {
  const productSection = document.querySelector('.product-section');
  if (!productSection) return 0;

  const rect = productSection.getBoundingClientRect();
  const sectionHeight = productSection.offsetHeight;
  const viewportHeight = window.innerHeight;

  // Progress through the sticky area (first half of section)
  const stickyArea = sectionHeight - viewportHeight;
  const scrolled = -rect.top;

  if (stickyArea <= 0) return 0;
  let progress = Math.max(0, Math.min(1, scrolled / stickyArea));

  return progress;
}

function updateShoeRotation(progress) {
  // Map 0-1 progress to 0-360 degrees
  const degrees = progress * 360;

  // Apply 3D rotation
  if (shoe3d) {
    shoe3d.style.transform = `rotateY(${degrees}deg)`;

    // Add subtle Z-axis shift for depth
    const zShift = Math.sin(progress * Math.PI * 2) * 30;
    shoe3d.style.transform += ` translateZ(${zShift}px)`;
  }

  // Cycle through shoe images based on angle
  // 0° -> index 0, 120° -> index 1, 240° -> index 2, 360° -> index 0
  const normalizedDeg = degrees % 360;
  let imgIndex;
  if (normalizedDeg < 120) imgIndex = 0;
  else if (normalizedDeg < 240) imgIndex = 1;
  else imgIndex = 2;

  setShoeImage(imgIndex, productShoeImgs);

  // Update the hero shoe to match at certain points for consistency
  if (Math.abs(normalizedDeg % 120) < 5 || Math.abs(normalizedDeg % 120) > 115) {
    // Only sync during section transition
  }

  // Update Japanese overlay text
  updateJpOverlay(progress);
}

// ==============================
// JAPANESE OVERLAY TEXT ANIMATION
// ==============================

const jpTexts = ['加速', '速度', '未来', '都市', '運動', '革新', '疾走'];
const jpOverlay = document.getElementById('jpOverlay');

function updateJpOverlay(progress) {
  if (!jpOverlay) return;

  const index = Math.floor(progress * jpTexts.length) % jpTexts.length;
  jpOverlay.textContent = jpTexts[index];

  // Animate horizontal position based on scroll
  const offset = 5 - (progress * 10);
  jpOverlay.style.right = `${offset}%`;
  jpOverlay.style.opacity = 0.015 + (Math.sin(progress * Math.PI) * 0.02);

  // Blur during transitions
  const blurAmount = Math.sin(progress * jpTexts.length * Math.PI) * 0.5;
  jpOverlay.style.filter = `blur(${Math.abs(blurAmount)}px)`;
}

// ==============================
// SCROLL PROGRESS BAR
// ==============================

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  document.getElementById('scrollProgress').style.width = `${progress}%`;
}

// ==============================
// METRO NAVIGATION — ACTIVE STATION
// ==============================

function updateActiveNav() {
  const sections = document.querySelectorAll('section[id], footer[id]');
  const navStations = document.querySelectorAll('.nav-station');

  let currentSection = '';
  const scrollPos = window.scrollY + 150;

  sections.forEach(section => {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;
    if (scrollPos >= top && scrollPos < bottom) {
      currentSection = section.id;
    }
  });

  navStations.forEach(station => {
    const stationId = station.getAttribute('data-station');
    if (stationId === currentSection) {
      station.style.color = '#00f0ff';
    } else {
      station.style.color = '';
    }
  });
}

// ==============================
// SUBWAY TEXT PARALLAX
// ==============================

function updateSubwayParallax() {
  const scrollTexts = document.querySelectorAll('.scroll-text-track');
  scrollTexts.forEach(track => {
    const speed = track.classList.contains('reverse') ? 0.3 : 0.5;
    const offset = window.scrollY * speed;
    track.style.transform = `translateX(${-offset}px)`;
  });
}

// ==============================
// MAIN SCROLL HANDLER
// ==============================

let isScrolling;
let lastScrollY = window.scrollY;

function onScroll() {
  const progress = getScrollProgress();

  // Update shoe rotation
  updateShoeRotation(progress);

  // Update progress bar
  updateScrollProgress();

  // Update nav
  updateActiveNav();

  // Subway parallax
  updateSubwayParallax();

  lastScrollY = window.scrollY;
}

// Throttled scroll listener
let isScrolling;
window.addEventListener('scroll', () => {
  window.requestAnimationFrame(onScroll);
});

// ==============================
// SUBSCRIBE BUTTON FEEDBACK
// ==============================

document.getElementById('subscribeBtn')?.addEventListener('click', function() {
  const input = document.getElementById('subscribeInput');
  if (input && input.value.trim()) {
    this.textContent = '✓ SUBSCRIBED';
    this.style.background = '#059669';
    setTimeout(() => {
      this.textContent = 'SIGN UP';
      this.style.background = '';
      input.value = '';
    }, 2000);
  }
});

// ==============================
// INITIAL LOAD SEQUENCE
// ==============================

document.addEventListener('DOMContentLoaded', () => {
  // Start with an initial progress update
  onScroll();

  // Slight delay before showing content for dramatic effect
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 1s ease';

  setTimeout(() => {
    document.body.style.opacity = '1';
  }, 400);

  // Initial shoe image state
  setShoeImage(0, productShoeImgs);
});

// ==============================
// RESIZE HANDLER
// ==============================

window.addEventListener('resize', () => {
  onScroll();
});
