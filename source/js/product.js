/* ==============================
   PRODUCT SHOWROOM — THREE.JS
   Urban Velocity — 都市速度
   ============================== */

import * as THREE from 'three';

const canvas = document.getElementById('productScene');
if (!canvas) throw new Error('#productScene not found');

/* --- Scene --- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050505, 4, 15);

/* --- Camera --- */
const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.2, 4.5);
camera.lookAt(0, 0, 0);

/* --- Renderer --- */
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

/* --- Lights --- */
const ambient = new THREE.AmbientLight(0xffffff, 0.1);
scene.add(ambient);

const rimRed = new THREE.PointLight(0xff0033, 3, 8);
rimRed.position.set(2.5, 2, 3);
scene.add(rimRed);

const rimCyan = new THREE.PointLight(0x00ccff, 2.5, 8);
rimCyan.position.set(-2.5, 1, 3);
scene.add(rimCyan);

const keyLight = new THREE.DirectionalLight(0xffffff, 2);
keyLight.position.set(1, 4, 3);
scene.add(keyLight);

const backLight = new THREE.PointLight(0xff4400, 0.6, 6);
backLight.position.set(0, -1, -3);
scene.add(backLight);

/* --- Product Object (shoe-inspired geometry) --- */
const group = new THREE.Group();

// Main body — sleek wedge shape
const bodyMat = new THREE.MeshPhysicalMaterial({
  color: 0x111111,
  metalness: 0.9,
  roughness: 0.1,
  clearcoat: 0.2,
  clearcoatRoughness: 0.15,
});
const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.4, 2.2),
  bodyMat
);
body.position.y = 0.1;
body.castShadow = true;
group.add(body);

// Top panel — gloss accent
const topMat = new THREE.MeshPhysicalMaterial({
  color: 0x1a1a1a,
  metalness: 0.7,
  roughness: 0.2,
});
const topPanel = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.05, 1.8),
  topMat
);
topPanel.position.y = 0.35;
group.add(topPanel);

// Stripe — red accent
const stripeMat = new THREE.MeshPhysicalMaterial({
  color: 0xcc0011,
  metalness: 0.2,
  roughness: 0.3,
  emissive: 0xcc0011,
  emissiveIntensity: 0.03,
});
const stripe = new THREE.Mesh(
  new THREE.BoxGeometry(0.06, 0.02, 1.6),
  stripeMat
);
stripe.position.set(0, 0.38, 0);
group.add(stripe);

// Sole
const soleMat = new THREE.MeshPhysicalMaterial({
  color: 0x222222,
  metalness: 0.05,
  roughness: 0.9,
});
const sole = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 0.08, 2.0),
  soleMat
);
sole.position.y = -0.15;
group.add(sole);

// Air unit glow
const airMat = new THREE.MeshPhysicalMaterial({
  color: 0x00ccff,
  emissive: 0x00ccff,
  emissiveIntensity: 0.1,
  metalness: 0.1,
  roughness: 0.2,
  transparent: true,
  opacity: 0.5,
});
const airUnit = new THREE.Mesh(
  new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24),
  airMat
);
airUnit.position.set(0.3, -0.11, 0.4);
group.add(airUnit);

const airUnit2 = new THREE.Mesh(
  new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24),
  airMat
);
airUnit2.position.set(-0.3, -0.11, -0.3);
group.add(airUnit2);

scene.add(group);

/* --- Floor --- */
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a,
  metalness: 0.6,
  roughness: 0.5,
});
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(8, 8),
  floorMat
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.3;
scene.add(floor);

/* --- Ambient particles --- */
const pCount = 400;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount * 3; i++) {
  pPos[i] = (Math.random() - 0.5) * 15;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.01,
  transparent: true,
  opacity: 0.12,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(pGeo, pMat);
particles.position.y = 1;
scene.add(particles);

/* --- Mouse interaction --- */
let mouseX = 0;
let mouseY = 0;
let targetRotY = 0;
let targetRotX = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5);
  mouseY = (e.clientY / window.innerHeight - 0.5);

  targetRotY = mouseX * 0.6;
  targetRotX = mouseY * -0.3;
});

/* --- Animation loop --- */
let currentRotY = 0;
let currentRotX = 0;
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Smooth interpolation
  currentRotY += (targetRotY + Math.sin(time * 0.3) * 0.1 - currentRotY) * 0.04;
  currentRotX += (targetRotX - currentRotX) * 0.04;

  // Auto-rotate when no mouse interaction
  if (Math.abs(mouseX) < 0.02 && Math.abs(mouseY) < 0.02) {
    currentRotY += 0.002;
  }

  group.rotation.y = currentRotY;
  group.rotation.x = currentRotX;

  // Subtle hover
  group.position.y = Math.sin(time * 0.8) * 0.03;

  // Camera subtle drift
  camera.position.x = Math.sin(time * 0.1) * 0.15 + mouseX * 0.3;
  camera.lookAt(0, 0, 0);

  // Animate lights
  rimRed.position.x = 2.5 + Math.sin(time * 0.2) * 0.8;
  rimCyan.position.x = -2.5 + Math.cos(time * 0.15) * 0.8;

  // Air unit glow pulse
  airMat.emissiveIntensity = 0.1 + Math.sin(time * 1.5) * 0.06;

  // Particles
  particles.rotation.y += 0.0003;

  renderer.render(scene, camera);
}

animate();

/* --- Product ID from URL --- */
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const nameEl = document.getElementById('productName');
const idEl = document.getElementById('productIdDisplay');

if (productId) {
  const num = String(Number(productId) + 1).padStart(4, '0');
  if (nameEl) nameEl.innerHTML = `URBAN RUN <span class="crimson">${num}</span>`;
  if (idEl) idEl.textContent = `URBAN RUN ${num}`;
}

/* --- Resize --- */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

/* --- Buy button --- */
document.getElementById('buyBtn')?.addEventListener('click', function() {
  this.textContent = '✓ SYSTEM ACQUIRED';
  this.style.background = '#059669';
  setTimeout(() => {
    this.innerHTML = 'BUY SYSTEM <img src="assets/icons/arrow-right.svg" alt="">';
    this.style.background = '';
  }, 2000);
});
