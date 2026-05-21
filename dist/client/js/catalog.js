/* ==============================
   CATALOG — DOSSIER ARCHIVE
   Tomodachi Shoes — 機密保管庫
   ============================== */

const API_BASE = window.location.origin + '/api';
const USE_API = false; // Set to true when backend is running

const TOTAL = 1200;
const CHUNK = 60;

const shoeAssets = [
  'assets/images/shoe4.svg', 'assets/images/shoe5.svg',
  'assets/images/shoe6.svg', 'assets/images/shoe7.svg',
  'assets/images/shoe8.svg',
];

// Add JPG shoe images for variety
const jpgAssets = [
  'assets/images/842.jpg', 'assets/images/4476.jpg', 'assets/images/1581.jpg',
  'assets/images/3550.jpg', 'assets/images/1546.jpg', 'assets/images/4672.jpg',
  'assets/images/7129.jpg', 'assets/images/5529.jpg', 'assets/images/6361.jpg',
  'assets/images/5560.jpg', 'assets/images/5781.jpg', 'assets/images/1135.jpg',
  'assets/images/3969.jpg', 'assets/images/3117.jpg', 'assets/images/1324.jpg',
  'assets/images/4200.jpg', 'assets/images/6582.jpg', 'assets/images/1616.jpg',
  'assets/images/968.jpg', 'assets/images/1103.jpg',
];
const allAssets = [...shoeAssets, ...jpgAssets];

const seriesNames = [
  'TOKYO AERO', 'SHIBUYA NIGHT', 'AKIHABARA TECH',
  'SHINJUKU SPEED', 'GINZA LUXE', 'HARAJUKU STREET',
  'OSAKA RUN', 'NEO TOKYO',
];

const jpLabels = ['速度', '加速', '未来', '都市', '運動', '革新', '疾走', '風'];

const filters = ['all', 'speed', 'tech', 'limited'];

// Market simulation — seeded pseudo-random
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getProductData(i) {
  const rng = seededRandom(i * 1337 + 42);
  const imgIdx = i % allAssets.length;
  const seriesIdx = Math.floor(i / 8) % seriesNames.length;
  const jpIdx = i % jpLabels.length;
  const filterIdx = i % filters.length;
  const category = filters[filterIdx];

  // Seeded price — stable per ID
  const basePrice = 180 + (i % 120);
  const volatility = rng() * 40;
  const price = (basePrice + volatility).toFixed(2);

  // Resale value — higher for limited
  const resaleMultiplier = category === 'limited' ? 1.8 + rng() * 0.8 : 0.9 + rng() * 0.4;
  const resale = (parseFloat(price) * resaleMultiplier).toFixed(2);

  // Rarity tier
  const rarityRoll = rng();
  const rarity = rarityRoll > 0.95 ? 'LEGENDARY' :
                 rarityRoll > 0.80 ? 'RARE' :
                 rarityRoll > 0.50 ? 'LIMITED' : 'COMMON';

  // Stock level
  const stock = category === 'limited' ? Math.floor(rng() * 20 + 1) :
                Math.floor(rng() * 500 + 50);

  // Market trend
  const trend = rng() > 0.6 ? '↑ BULLISH' : '→ STABLE';

  return {
    id: i,
    name: `UNIT ${String(i + 1).padStart(4, '0')}`,
    series: seriesNames[seriesIdx],
    jp: jpLabels[jpIdx],
    img: allAssets[imgIdx],
    price: `¥${parseFloat(price).toLocaleString()}`,
    resale: `¥${parseFloat(resale).toLocaleString()}`,
    category,
    rarity,
    stock,
    trend,
    status: stock > 0 ? 'ACTIVE' : 'ARCHIVED',
  };
}

const products = Array.from({ length: TOTAL }, (_, i) => getProductData(i));

const grid = document.getElementById('productGrid');
const footer = document.getElementById('catalogFooter');
const countEl = document.getElementById('productCount');
const searchInput = document.getElementById('search');
const filterBtns = document.querySelectorAll('.ts-filter');
const filterBar = document.getElementById('filterBar');

let renderedCount = 0;
let activeFilter = 'all';
let searchQuery = '';

let renderQueued = false;

function renderChunk() {
  const filtered = getFilteredProducts();
  const slice = filtered.slice(renderedCount, renderedCount + CHUNK);

  slice.forEach(p => { grid.appendChild(createCard(p)); });
  renderedCount += slice.length;

  if (countEl) { countEl.textContent = `${filtered.length} DOSSIERS`; }

  if (renderedCount < filtered.length) {
    renderQueued = true;
    requestAnimationFrame(renderChunk);
  } else {
    if (footer) footer.style.display = 'none';
    renderQueued = false;
  }
}

function createCard(p) {
  const div = document.createElement('a');
  div.className = 'ts-dossier-card';
  div.href = `product.html?id=${p.id}`;
  div.setAttribute('data-category', p.category.toLowerCase());
  div.setAttribute('data-name', p.name.toLowerCase());

  div.innerHTML = `
    <div class="ts-dossier-card-badge">${p.series}</div>
    <img class="ts-dossier-card-img" src="${p.img}" alt="${p.name}" loading="lazy" />
    <div class="ts-dossier-card-name">${p.name}</div>
    <div class="ts-dossier-card-series">${p.jp} · ${p.rarity} · ${p.trend}</div>
    <div class="ts-dossier-card-meta">
      <div class="ts-dossier-card-price">${p.price}</div>
      <div class="ts-dossier-card-status ${p.status.toLowerCase()}">${p.status}</div>
    </div>
    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.45rem; color: #71717A; margin-top: 0.5rem; letter-spacing: 0.1em;">
      STOCK: ${p.stock} · RESALE: ${p.resale}
    </div>
  `;

  // GSAP entrance
  if (typeof gsap !== 'undefined') {
    div.style.opacity = '0';
    div.style.transform = 'translateY(10px)';
  }

  return div;
}

function getFilteredProducts() {
  let list = products;
  if (activeFilter !== 'all') { list = list.filter(p => p.category === activeFilter); }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q) ||
      p.jp.includes(q) ||
      p.rarity.toLowerCase().includes(q)
    );
  }
  return list;
}

function resetGrid() {
  grid.innerHTML = '';
  renderedCount = 0;
  if (footer) { footer.style.display = ''; footer.textContent = 'DECRYPTING DOSSIERS...'; }
  if (renderQueued) return;
  renderChunk();
}

// Search
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  resetGrid();
});

// Filters
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter');
    resetGrid();
  });
});

// Observer for progressive loading
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && renderedCount < getFilteredProducts().length) {
      if (!renderQueued) renderChunk();
    }
  });
}, { rootMargin: '400px' });

if (footer) observer.observe(footer);

// ==============================
// API-BACKED FETCH (when backend available)
// ==============================
async function fetchShoesFromAPI(params = {}) {
  const query = new URLSearchParams({
    page: '1',
    limit: '60',
    ...params,
  });
  try {
    const res = await fetch(`${API_BASE}/shoes?${query}`);
    if (!res.ok) throw new Error('API unavailable');
    return await res.json();
  } catch {
    return null;
  }
}

async function tryAPIMode() {
  if (!USE_API) return false;
  const result = await fetchShoesFromAPI();
  if (!result || !result.data?.length) return false;

  // Replace client-side products with API data
  const apiProducts = result.data.map((shoe, i) => ({
    id: i,
    name: shoe.name || `UNIT ${String(i + 1).padStart(4, '0')}`,
    series: shoe.market?.series || shoe.series || 'ARCHIVE',
    jp: shoe.jpLabel || '機密',
    img: shoe.primaryImage?.url || shoe.images?.[0]?.url || shoeAssets[i % shoeAssets.length],
    price: shoe.market?.priceFormatted || `¥${(890000 + i * 2600).toLocaleString()}`,
    resale: shoe.market?.resaleFormatted || '',
    category: shoe.market?.category || 'archive',
    rarity: shoe.market?.rarity || 'COMMON',
    stock: shoe.market?.stock || 0,
    status: shoe.market?.status || 'ACTIVE',
    trend: shoe.market?.trend || 'STABLE',
  }));

  // Replace products array
  products.length = 0;
  products.push(...apiProducts);
  resetGrid();
  return true;
}

// Try API first, fallback to client-side generation
if (USE_API) {
  tryAPIMode().then(used => {
    if (!used) renderChunk();
  });
} else {
  renderChunk();
}

// GSAP card entrance animation on scroll
if (typeof gsap !== 'undefined') {
  const observerGsap = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        gsap.to(entry.target, {
          opacity: 1, y: 0, duration: 0.5, ease: 'power2.out'
        });
        observerGsap.unobserve(entry.target);
      }
    });
  }, { rootMargin: '50px' });

  const checkCards = setInterval(() => {
    const cards = document.querySelectorAll('.ts-dossier-card');
    cards.forEach(card => observerGsap.observe(card));
    if (document.querySelectorAll('.ts-dossier-card').length >= getFilteredProducts().length) {
      clearInterval(checkCards);
    }
  }, 300);
}
