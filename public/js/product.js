/* ==============================
   PRODUCT SHOWROOM — WHITE VOID
   Tomodachi Shoes — 技術展示
   ============================== */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('productScene');
if (!canvas) throw new Error('#productScene not found');

/* --- Scene — Clean white void --- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

/* --- Camera --- */
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.2, 4.5);
camera.lookAt(0, 0, 0);

/* --- Renderer --- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* --- Post-processing --- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.15, 0.2, 0.08
);
composer.addPass(bloomPass);

/* --- Lights — soft white void illumination --- */
const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const rimPurple = new THREE.PointLight(0xa855f7, 1.5, 10);
rimPurple.position.set(2.5, 2, 3);
scene.add(rimPurple);

const rimCyan = new THREE.PointLight(0x8888ff, 1.0, 10);
rimCyan.position.set(-2.5, 1, 3);
scene.add(rimCyan);

const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
keyLight.position.set(1, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
fillLight.position.set(-1, 2, -2);
scene.add(fillLight);

const backLight = new THREE.PointLight(0xa855f7, 0.3, 8);
backLight.position.set(0, -1, -4);
scene.add(backLight);

const topLight = new THREE.DirectionalLight(0xffffff, 0.5);
topLight.position.set(0, 6, 0);
scene.add(topLight);

/* --- Floor (reflective podium) — white void --- */
const floorMat = new THREE.MeshPhysicalMaterial({
  color: 0xe0e0e0,
  metalness: 0.3,
  roughness: 0.4,
  envMapIntensity: 0.3,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.35;
scene.add(floor);

/* --- Product Object (premium shoe) --- */
const group = new THREE.Group();

// Main body — sleek wedge
const bodyMat = new THREE.MeshPhysicalMaterial({
  color: 0x181818,
  metalness: 0.85,
  roughness: 0.08,
  clearcoat: 0.25,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.5,
});
const body = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 0.35, 2.2),
  bodyMat
);
body.position.y = 0.1;
body.castShadow = true;
group.add(body);

// Top panel — gloss
const topMat = new THREE.MeshPhysicalMaterial({
  color: 0x222222,
  metalness: 0.6,
  roughness: 0.15,
});
const topPanel = new THREE.Mesh(
  new THREE.BoxGeometry(0.9, 0.04, 1.8),
  topMat
);
topPanel.position.y = 0.3;
group.add(topPanel);

// Stripe — purple accent
const stripeMat = new THREE.MeshPhysicalMaterial({
  color: 0xa855f7,
  metalness: 0.2,
  roughness: 0.3,
  emissive: 0xa855f7,
  emissiveIntensity: 0.04,
});
const stripe = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, 0.015, 1.6),
  stripeMat
);
stripe.position.set(0, 0.33, 0);
group.add(stripe);

// Second stripe — crimson
const stripe2Mat = new THREE.MeshPhysicalMaterial({
  color: 0xdc2626,
  metalness: 0.2,
  roughness: 0.3,
  emissive: 0xdc2626,
  emissiveIntensity: 0.03,
});
const stripe2 = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.015, 0.05),
  stripe2Mat
);
stripe2.position.set(0, 0.33, 0.9);
group.add(stripe2);

// Sole
const soleMat = new THREE.MeshPhysicalMaterial({
  color: 0x222222,
  metalness: 0.05,
  roughness: 0.85,
});
const sole = new THREE.Mesh(
  new THREE.BoxGeometry(1.0, 0.07, 2.0),
  soleMat
);
sole.position.y = -0.12;
group.add(sole);

// Air unit glow — purple
const airMat = new THREE.MeshPhysicalMaterial({
  color: 0xa855f7,
  emissive: 0xa855f7,
  emissiveIntensity: 0.12,
  metalness: 0.1,
  roughness: 0.2,
  transparent: true,
  opacity: 0.5,
});
const airUnit = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.28, 0.035, 24),
  airMat
);
airUnit.position.set(0.25, -0.085, 0.35);
group.add(airUnit);

const airUnit2 = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 0.035, 24),
  airMat
);
airUnit2.position.set(-0.25, -0.085, -0.25);
group.add(airUnit2);

scene.add(group);

/* --- Ambient particles (subtle dust in void) --- */
const pCount = 200;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(pCount * 3);
for (let i = 0; i < pCount * 3; i++) {
  pPos[i] = (Math.random() - 0.5) * 12;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({
  color: 0x888888,
  size: 0.006,
  transparent: true,
  opacity: 0.04,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(pGeo, pMat);
particles.position.y = 0.5;
scene.add(particles);

/* --- Mouse interaction --- */
let mouseX = 0;
let mouseY = 0;
let targetRotY = 0;
let targetRotX = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5);
  mouseY = (e.clientY / window.innerHeight - 0.5);
  targetRotY = mouseX * 0.5;
  targetRotX = mouseY * -0.25;
});

/* --- Animation loop --- */
let currentRotY = 0;
let currentRotX = 0;
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.008;

  // Smooth interpolation
  currentRotY += (targetRotY + Math.sin(time * 0.25) * 0.08 - currentRotY) * 0.03;
  currentRotX += (targetRotX - currentRotX) * 0.03;

  // Auto-rotate when idle
  if (Math.abs(mouseX) < 0.02 && Math.abs(mouseY) < 0.02) {
    currentRotY += 0.0015;
  }

  group.rotation.y = currentRotY;
  group.rotation.x = currentRotX;

  // Subtle hover
  group.position.y = Math.sin(time * 0.6) * 0.025;

  // Camera subtle drift
  camera.position.x = Math.sin(time * 0.08) * 0.12 + mouseX * 0.25;
  camera.lookAt(0, 0, 0);

  // Animate lights
  rimPurple.position.x = 2.5 + Math.sin(time * 0.15) * 0.6;
  rimCyan.position.x = -2.5 + Math.cos(time * 0.12) * 0.6;

  // Glow pulse
  stripeMat.emissiveIntensity = 0.04 + Math.sin(time * 1.2) * 0.025;
  airMat.emissiveIntensity = 0.12 + Math.sin(time * 1.5) * 0.05;
  airMat.opacity = 0.5 + Math.sin(time * 1.5) * 0.1;

  // Particles
  particles.rotation.y += 0.0002;

  composer.render();
}

animate();

/* --- Product ID from URL --- */
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');

const nameEl = document.getElementById('productName');
const idEl = document.getElementById('productIdDisplay');

if (productId) {
  const num = String(Number(productId) + 1).padStart(4, '0');
  if (nameEl) nameEl.innerHTML = `UNIT <span style="color: #A855F7;">${num}</span>`;
  if (idEl) idEl.textContent = `UNIT ${num}`;
}

/* --- Resize --- */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});

/* --- Buy button --- */
document.getElementById('buyBtn')?.addEventListener('click', function() {
  this.innerHTML = '✓ UNIT ACQUIRED';
  this.style.background = '#059669';
  setTimeout(() => {
    this.innerHTML = 'ACQUIRE UNIT <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    this.style.background = '';
  }, 2000);
});
