/* ==============================
   CATALOG — 1200+ PRODUCT GRID
   Urban Velocity — 都市速度
   ============================== */

const TOTAL = 1200;
const CHUNK = 60;

const shoeAssets = [
  'assets/images/shoe4.svg',
  'assets/images/shoe5.svg',
  'assets/images/shoe6.svg',
  'assets/images/shoe7.svg',
  'assets/images/big-shoe1.png',
  'assets/images/big-shoe2.png',
  'assets/images/big-shoe3.png',
];

const seriesNames = [
  'TOKYO AERO',
  'SHIBUYA NIGHT',
  'AKIHABARA TECH',
  'SHINJUKU SPEED',
  'GINZA LUXE',
  'HARAJUKU STREET',
];

const jpLabels = ['速度', '加速', '未来', '都市', '運動', '革新', '疾走', '風'];

const filters = ['all', 'speed', 'tech', 'limited'];

function getProductData(i) {
  const imgIdx = i % shoeAssets.length;
  const seriesIdx = Math.floor(i / 8) % seriesNames.length;
  const jpIdx = i % jpLabels.length;

  const filterIdx = i % filters.length;
  const category = filters[filterIdx];

  const price = (180 + (i % 120) + Math.random() * 40).toFixed(2);

  return {
    id: i,
    name: `URBAN RUN ${String(i + 1).padStart(4, '0')}`,
    series: seriesNames[seriesIdx],
    jp: jpLabels[jpIdx],
    img: shoeAssets[imgIdx],
    price: `$${price}`,
    category,
  };
}

// Pre-generate all product data
const products = Array.from({ length: TOTAL }, (_, i) => getProductData(i));

const grid = document.getElementById('productGrid');
const footer = document.getElementById('catalogFooter');
const countEl = document.getElementById('productCount');
const searchInput = document.getElementById('search');
const filterBtns = document.querySelectorAll('.filter-btn');
const filterBar = document.getElementById('filterBar');

let renderedCount = 0;
let activeFilter = 'all';
let searchQuery = '';

// --- Chunk renderer ---
let renderQueued = false;

function renderChunk() {
  const filtered = getFilteredProducts();

  const slice = filtered.slice(renderedCount, renderedCount + CHUNK);

  slice.forEach(p => {
    grid.appendChild(createCard(p));
  });

  renderedCount += slice.length;

  if (countEl) {
    countEl.textContent = `${filtered.length} ITEMS`;
  }

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
  div.className = 'card';
  div.href = `product.html?id=${p.id}`;
  div.setAttribute('data-category', p.category.toLowerCase());
  div.setAttribute('data-name', p.name.toLowerCase());

  div.innerHTML = `
    <img class="card-img" src="${p.img}" alt="${p.name}" loading="lazy" />
    <div class="card-name">${p.name}</div>
    <div class="card-series">${p.series}</div>
    <div class="card-price">${p.price}</div>
    <div class="card-overlay-jp">${p.jp}</div>
  `;

  return div;
}

// --- Filtering ---
function getFilteredProducts() {
  let list = products;

  if (activeFilter !== 'all') {
    list = list.filter(p => p.category === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q) ||
      p.jp.includes(q)
    );
  }

  return list;
}

function resetGrid() {
  grid.innerHTML = '';
  renderedCount = 0;
  if (footer) footer.style.display = '';
  if (footer) footer.textContent = 'LOADING...';

  if (renderQueued) return;

  renderChunk();
}

// --- Search handler ---
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  resetGrid();
});

// --- Filter handler ---
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.getAttribute('data-filter');
    resetGrid();
  });
});

// --- Observer for progressive loading when scrolled near bottom ---
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && renderedCount < getFilteredProducts().length) {
      if (!renderQueued) renderChunk();
    }
  });
}, { rootMargin: '400px' });

if (footer) observer.observe(footer);

// --- Init ---
renderChunk();
