/* ==============================
   THREE.JS — TOMODACHI SHOE SCENE
   Neo-Tokyo White Void Showroom
   ============================== */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('three-canvas');
if (!canvas) throw new Error('#three-canvas not found');

/* --- Scene --- */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

/* --- Camera --- */
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.8, 6);
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
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.15, 0.2, 0.1
);
composer.addPass(bloomPass);

/* --- Lights --- */
const ambient = new THREE.AmbientLight(0xffffff, 0.12);
scene.add(ambient);

const rimPurple = new THREE.DirectionalLight(0xa855f7, 2.5);
rimPurple.position.set(3, 2.5, 3);
scene.add(rimPurple);

const rimCrimson = new THREE.DirectionalLight(0xdc2626, 1.8);
rimCrimson.position.set(-3, 1.5, 2);
scene.add(rimCrimson);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(1, 4, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const rimBack = new THREE.DirectionalLight(0xff4400, 0.6);
rimBack.position.set(-1, -1, -3);
scene.add(rimBack);

const topLight = new THREE.DirectionalLight(0x8888ff, 0.4);
topLight.position.set(0, 5, 0);
scene.add(topLight);

/* --- Floor (reflective) --- */
const floorGeo = new THREE.PlaneGeometry(12, 12);
const floorMat = new THREE.MeshPhysicalMaterial({
  color: 0x0a0a0a,
  metalness: 0.7,
  roughness: 0.3,
  envMapIntensity: 0.3,
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.8;
floor.receiveShadow = true;
scene.add(floor);

/* --- Shoe Group --- */
const shoeGroup = new THREE.Group();

// Main shoe body — sleek aerodynamic form
const upperMat = new THREE.MeshPhysicalMaterial({
  color: 0x111111,
  metalness: 0.85,
  roughness: 0.12,
  clearcoat: 0.15,
  clearcoatRoughness: 0.2,
  envMapIntensity: 1.5,
});

const accentMat = new THREE.MeshPhysicalMaterial({
  color: 0xa855f7,
  metalness: 0.2,
  roughness: 0.3,
  emissive: 0xa855f7,
  emissiveIntensity: 0.06,
});

const soleMat = new THREE.MeshPhysicalMaterial({
  color: 0x222222,
  metalness: 0.05,
  roughness: 0.85,
});

// Body — torus knot for organic shape
const body = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.85, 0.25, 128, 24),
  upperMat
);
body.castShadow = true;
shoeGroup.add(body);

// Accent ring — purple
const accentRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.9, 0.035, 32, 64),
  accentMat
);
accentRing.position.y = 0.08;
accentRing.rotation.x = Math.PI / 2;
shoeGroup.add(accentRing);

// Second accent ring
const accentRing2 = new THREE.Mesh(
  new THREE.TorusGeometry(0.7, 0.025, 24, 48),
  accentMat
);
accentRing2.position.y = -0.1;
accentRing2.rotation.x = Math.PI / 2;
shoeGroup.add(accentRing2);

// Sole base
const sole = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.75, 0.08, 32),
  soleMat
);
sole.position.y = -0.5;
sole.castShadow = true;
shoeGroup.add(sole);

// Air unit — glowing purple
const airMat = new THREE.MeshPhysicalMaterial({
  color: 0xa855f7,
  emissive: 0xa855f7,
  emissiveIntensity: 0.15,
  metalness: 0.1,
  roughness: 0.2,
  transparent: true,
  opacity: 0.5,
});

const airUnit = new THREE.Mesh(
  new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24),
  airMat
);
airUnit.position.set(0.25, -0.46, 0.35);
shoeGroup.add(airUnit);

const airUnit2 = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.28, 0.04, 24),
  airMat
);
airUnit2.position.set(-0.25, -0.46, -0.3);
shoeGroup.add(airUnit2);

// Heel tab
const heelMat = new THREE.MeshPhysicalMaterial({
  color: 0x333333,
  metalness: 0.5,
  roughness: 0.3,
});
const heel = new THREE.Mesh(
  new THREE.BoxGeometry(0.15, 0.3, 0.15),
  heelMat
);
heel.position.set(0, 0.2, -0.85);
shoeGroup.add(heel);

// Heel accent
const heelAccent = new THREE.Mesh(
  new THREE.BoxGeometry(0.08, 0.02, 0.08),
  accentMat
);
heelAccent.position.set(0, 0.35, -0.85);
shoeGroup.add(heelAccent);

scene.add(shoeGroup);

/* --- Ambient floating particles --- */
const particleCount = 600;
const pGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 18;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const pMat = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.012,
  transparent: true,
  opacity: 0.08,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(pGeo, pMat);
particles.position.y = 1.5;
scene.add(particles);

/* --- State --- */
let targetCameraX = 0;
let targetCameraY = 1.8;
let targetShoeRotY = 0;
let targetShoeRotX = 0;
let targetShoeY = 0;
let scrollProgress = 0;

export function updateScrollState(scrollY, progress) {
  scrollProgress = progress;
  const angle = scrollY * 0.0005;
  targetCameraX = Math.sin(angle) * 2.0;
  targetCameraY = 1.8 + Math.sin(angle * 0.4) * 0.2;
  targetShoeRotY = scrollY * 0.002;
  targetShoeRotX = Math.sin(scrollY * 0.0008) * 0.08;
  targetShoeY = Math.sin(scrollY * 0.0015) * 0.1;
}

export function updateMouseState(x, y) {
  targetCameraX += (x * 1.0 - targetCameraX) * 0.02;
  targetCameraY += (1.8 + y * 0.3 - targetCameraY) * 0.02;
}

/* --- Animation --- */
let cameraX = 0;
let cameraY = 1.8;
let shoeRotY = 0;
let shoeRotX = 0;
let shoeY = 0;
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  time += 0.008;

  // Smooth interpolation
  cameraX += (targetCameraX - cameraX) * 0.03;
  cameraY += (targetCameraY - cameraY) * 0.03;
  shoeRotY += (targetShoeRotY - shoeRotY) * 0.03;
  shoeRotX += (targetShoeRotX - shoeRotX) * 0.03;
  shoeY += (targetShoeY - shoeY) * 0.03;

  // Camera
  camera.position.x = cameraX;
  camera.position.y = cameraY;
  camera.position.z = 6 - Math.abs(cameraX) * 0.2;
  camera.lookAt(0, 0, 0);

  // Shoe transforms
  shoeGroup.rotation.y = shoeRotY;
  shoeGroup.rotation.x = shoeRotX;
  shoeGroup.position.y = shoeY;

  // Subtle idle float
  shoeGroup.position.y += Math.sin(time * 0.8) * 0.015;

  // Glow pulse on accent
  accentMat.emissiveIntensity = 0.06 + Math.sin(time * 1.2) * 0.03;
  airMat.emissiveIntensity = 0.15 + Math.sin(time * 1.5) * 0.05;
  airMat.opacity = 0.5 + Math.sin(time * 1.5) * 0.1;

  // Particles drift
  particles.rotation.y += 0.00015;

  // Light animation
  rimPurple.position.x = 3 + Math.sin(time * 0.3) * 0.8;
  rimCrimson.position.x = -3 + Math.sin(time * 0.4 + 1) * 0.8;
  rimPurple.intensity = 2.5 + Math.sin(time * 0.5) * 0.3;

  composer.render();
}

animate();

/* --- Resize --- */
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
