import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createPickShape, createPickGeometry } from './pickGeometry.js';

// ── Renderer ─────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;

// ── Scene ────────────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);

// subtle fog for depth
scene.fog = new THREE.FogExp2(0x0d0d1a, 0.006);

// ── Camera ────────────────────────────────────────────────────────────────────

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
camera.position.set(18, 12, 75);

// ── Controls ─────────────────────────────────────────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 20;
controls.maxDistance = 200;

// ── Lights ───────────────────────────────────────────────────────────────────

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xfff4e0, 1.8);
key.position.set(60, 90, 60);
scene.add(key);

const fill = new THREE.DirectionalLight(0x3355aa, 0.6);
fill.position.set(-60, -30, -40);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.4);
rim.position.set(0, -60, -80);
scene.add(rim);

// ── Material ─────────────────────────────────────────────────────────────────

const material = new THREE.MeshStandardMaterial({
  color: 0xe8793a,
  roughness: 0.25,
  metalness: 0.05,
});

// ── Pick mesh ─────────────────────────────────────────────────────────────────

let pickMesh = null;

function rebuildPick() {
  const type         = document.querySelector('[data-shape].active').dataset.shape;
  const width        = parseFloat(document.getElementById('width').value);
  const height       = parseFloat(document.getElementById('height').value);
  const thickness    = parseFloat(document.getElementById('thickness').value);
  const tipSharpness = parseFloat(document.getElementById('tip-sharpness').value);

  const shape    = createPickShape(type, width, height, tipSharpness);
  const geometry = createPickGeometry(shape, thickness);

  if (pickMesh) {
    scene.remove(pickMesh);
    pickMesh.geometry.dispose();
  }

  pickMesh = new THREE.Mesh(geometry, material);
  scene.add(pickMesh);
}

// ── UI wiring ─────────────────────────────────────────────────────────────────

function initUI() {
  // Sliders
  [
    ['width',         'width-val',     v => v],
    ['height',        'height-val',    v => v],
    ['thickness',     'thickness-val', v => parseFloat(v).toFixed(1)],
    ['tip-sharpness', 'tip-val',       v => v],
  ].forEach(([id, displayId, fmt]) => {
    const input   = document.getElementById(id);
    const display = document.getElementById(displayId);
    input.addEventListener('input', () => {
      display.textContent = fmt(input.value);
      rebuildPick();
    });
  });

  // Shape selector
  document.querySelectorAll('[data-shape]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-shape]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      rebuildPick();
    });
  });

  // Color picker
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      material.color.set(btn.dataset.color);
    });
  });

  // Download STL
  document.getElementById('download-btn').addEventListener('click', () => {
    if (!pickMesh) return;

    const exporter = new STLExporter();
    const stl      = exporter.parse(pickMesh, { binary: true });
    const blob     = new Blob([stl], { type: 'application/octet-stream' });
    const url      = URL.createObjectURL(blob);

    const type      = document.querySelector('[data-shape].active').dataset.shape;
    const width     = document.getElementById('width').value;
    const height    = document.getElementById('height').value;
    const thickness = parseFloat(document.getElementById('thickness').value).toFixed(1);

    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pick-${type}-${width}x${height}x${thickness}mm.stl`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Dismiss orbit hint on first interaction
  const hint = document.getElementById('hint-orbit');
  renderer.domElement.addEventListener('pointerdown', () => {
    hint.style.opacity = '0';
    hint.style.transition = 'opacity 0.4s';
  }, { once: true });
}

// ── Resize ────────────────────────────────────────────────────────────────────

function onResize() {
  const preview = document.getElementById('preview');
  const w = preview.clientWidth;
  const h = preview.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

// ── Animation loop ────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

window.addEventListener('resize', onResize);
initUI();
onResize();
rebuildPick();
animate();
