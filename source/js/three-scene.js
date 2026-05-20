/* ==============================
   THREE.JS — CINEMATIC SHOE SCENE
   Urban Velocity / Tokyo Subway
   ============================== */

import * as THREE from 'three';

const canvas = document.getElementById('three-canvas');
if (!canvas) throw new Error('#three-canvas not found');

/* --- Scene --- */
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x050505, 5, 20);

/* --- Camera --- */
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.5, 7);
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
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

/* --- Lights --- */
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);

const rimLight = new THREE.DirectionalLight(0xff0033, 2);
rimLight.position.set(3, 2, 3);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0x00ccff, 1.5);
fillLight.position.set(-3, 1, 2);
scene.add(fillLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(1, 4, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const rimLight2 = new THREE.DirectionalLight(0xff4400, 0.8);
rimLight2.position.set(-1, -2, -3);
scene.add(rimLight2);

/* --- Floor (reflective base) --- */
const floorGeo = new THREE.PlaneGeometry(12, 12);
const floorMat = new THREE.MeshStandardMaterial({
  color: 0x0a0a0a,
  metalness: 0.8,
  roughness: 0.4,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.6;
floor.receiveShadow = true;
scene.add(floor);

/* --- Shoe (placeholder geometry) --- */
const shoeGroup = new THREE.Group();

const shoeMat = new THREE.MeshPhysicalMaterial({
  color: 0x111111,
  metalness: 0.85,
  roughness: 0.15,
  clearcoat: 0.1,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.2,
});

const accentMat = new THREE.MeshPhysicalMaterial({
  color: 0xcc0011,
  metalness: 0.3,
  roughness: 0.4,
  emissive: 0xcc0011,
  emissiveIntensity: 0.05,
});

const soleMat = new THREE.MeshPhysicalMaterial({
  color: 0x222222,
  metalness: 0.1,
  roughness: 0.8,
});

// Main body
const mainBody = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.9, 0.28, 128, 24),
  shoeMat
);
mainBody.castShadow = true;
shoeGroup.add(mainBody);

// Accent ring
const accent = new THREE.Mesh(
  new THREE.TorusGeometry(0.95, 0.04, 32, 64),
  accentMat
);
accent.position.y = 0.1;
accent.rotation.x = Math.PI / 2;
shoeGroup.add(accent);

// Sole base
const sole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32),
  soleMat
);
sole.position.y = -0.45;
sole.castShadow = true;
shoeGroup.add(sole);

// Sole air unit (glowing)
const airUnit = new THREE.Mesh(
  new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24),
  new THREE.MeshPhysicalMaterial({
    color: 0x00ccff,
    emissive: 0x00ccff,
    emissiveIntensity: 0.15,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.6,
  })
);
airUnit.position.y = -0.41;
shoeGroup.add(airUnit);

scene.add(shoeGroup);

/* --- Ambient particles (city dust / rain) --- */
const particleCount = 800;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 20;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.015,
  transparent: true,
  opacity: 0.15,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(particleGeo, particleMat);
particles.position.y = 2;
scene.add(particles);

/* --- Scroll / mouse state shared from main script --- */
let targetCameraX = 0;
let targetCameraY = 1.5;
let targetShoeRotY = 0;
let targetShoeRotX = 0;
let targetShoeY = 0;
let scrollProgress = 0;

export function updateScrollState(scrollY, progress) {
  scrollProgress = progress;

  // Camera: orbit around shoe based on scroll
  const angle = scrollY * 0.0008;
  targetCameraX = Math.sin(angle) * 2.5;
  targetCameraY = 1.5 + Math.sin(angle * 0.5) * 0.3;

  // Shoe rotation based on scroll
  targetShoeRotY = scrollY * 0.003;
  targetShoeRotX = Math.sin(scrollY * 0.001) * 0.1;
  targetShoeY = Math.sin(scrollY * 0.002) * 0.15;
}

export function updateMouseState(x, y) {
  targetCameraX += (x * 1.2 - targetCameraX) * 0.02;
  targetCameraY += (1.5 + y * 0.4 - targetCameraY) * 0.02;
}

/* --- Animation loop --- */
let cameraX = 0;
let cameraY = 1.5;
let shoeRotY = 0;
let shoeRotX = 0;
let shoeY = 0;

function animate() {
  requestAnimationFrame(animate);

  // Smooth interpolation
  cameraX += (targetCameraX - cameraX) * 0.04;
  cameraY += (targetCameraY - cameraY) * 0.04;
  shoeRotY += (targetShoeRotY - shoeRotY) * 0.04;
  shoeRotX += (targetShoeRotX - shoeRotX) * 0.04;
  shoeY += (targetShoeY - shoeY) * 0.04;

  // Apply camera
  camera.position.x = cameraX;
  camera.position.y = cameraY;
  camera.position.z = 7 - Math.abs(cameraX) * 0.3;
  camera.lookAt(0, 0, 0);

  // Apply shoe transforms
  shoeGroup.rotation.y = shoeRotY;
  shoeGroup.rotation.x = shoeRotX;
  shoeGroup.position.y = shoeY;

  // Subtle hover
  shoeGroup.position.y += Math.sin(Date.now() * 0.001) * 0.02;

  // Animate accent glow
  accentMat.emissiveIntensity = 0.05 + Math.sin(Date.now() * 0.002) * 0.03;

  // Animate particles
  particles.rotation.y += 0.0002;

  // Animate lights
  rimLight.position.x = 3 + Math.sin(Date.now() * 0.0005) * 1;
  rimLight2.position.x = -1 + Math.sin(Date.now() * 0.0007) * 1.5;

  renderer.render(scene, camera);
}

animate();

/* --- Resize --- */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
