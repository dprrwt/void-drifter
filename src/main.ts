/**
 * SINGULARITY
 * 
 * A Friday Original
 * 
 * You are a point of light falling into infinity.
 * Collect memories before they're lost to the void.
 * The closer you get to the center, the slower time flows.
 * There is no winning. Only presence.
 */

import * as THREE from 'three';
import './style.css';

// === TYPES ===
interface GameState {
  phase: 'title' | 'playing' | 'ended';
  depth: number;
  memoriesCollected: number;
  timePlayed: number;
  timeScale: number;
}

interface Entity {
  mesh: THREE.Mesh | THREE.Points;
  velocity: THREE.Vector3;
  type: 'memory' | 'entropy';
  life: number;
  maxLife: number;
}

// === CONSTANTS ===
const COLORS = {
  void: 0x050510,
  player: 0xffeaa7,
  memory: 0x00cec9,
  entropy: 0xd63031,
  trail: 0xdfe6e9,
  singularity: 0x1a1a2e,
};

const CONFIG = {
  playerRadius: 0.15,
  singularityRadius: 2,
  worldRadius: 25,
  memorySpawnRate: 0.02,
  entropySpawnRate: 0.01,
  gravityStrength: 0.5,
  playerSpeed: 0.15,
  trailLength: 50,
  maxEntities: 60,
};

// === GLOBALS ===
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let player: THREE.Mesh;
let playerGlow: THREE.PointLight;
let singularity: THREE.Mesh;
let trails: THREE.Points;
let trailPositions: Float32Array;
let trailIndex = 0;

const entities: Entity[] = [];
const state: GameState = {
  phase: 'title',
  depth: 0,
  memoriesCollected: 0,
  timePlayed: 0,
  timeScale: 1,
};

// Input state
const input = {
  target: new THREE.Vector2(0, 0),
  active: false,
};

// Clock
const clock = new THREE.Clock();
let lastTrailTime = 0;

// === INITIALIZATION ===
function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLORS.void);
  scene.fog = new THREE.FogExp2(COLORS.void, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.z = 20;

  // Renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  document.getElementById('app')!.appendChild(renderer.domElement);

  // Create game objects
  createSingularity();
  createPlayer();
  createTrails();
  createAmbientParticles();

  // Lighting
  const ambient = new THREE.AmbientLight(0x111122, 0.5);
  scene.add(ambient);

  // Events
  setupEvents();

  // UI
  setupUI();

  // Start loop
  animate();
}

function createSingularity() {
  // Core sphere
  const geometry = new THREE.SphereGeometry(CONFIG.singularityRadius, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.singularity,
    transparent: true,
    opacity: 0.8,
  });
  singularity = new THREE.Mesh(geometry, material);
  scene.add(singularity);

  // Glow rings
  for (let i = 0; i < 5; i++) {
    const ringGeo = new THREE.RingGeometry(
      CONFIG.singularityRadius + 0.5 + i * 0.8,
      CONFIG.singularityRadius + 0.7 + i * 0.8,
      64
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: COLORS.singularity,
      transparent: true,
      opacity: 0.3 - i * 0.05,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.random() * Math.PI;
    ring.rotation.y = Math.random() * Math.PI;
    singularity.add(ring);
  }
}

function createPlayer() {
  // Core
  const geometry = new THREE.SphereGeometry(CONFIG.playerRadius, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.player,
  });
  player = new THREE.Mesh(geometry, material);
  player.position.set(8, 5, 0);
  scene.add(player);

  // Glow
  playerGlow = new THREE.PointLight(COLORS.player, 2, 8);
  player.add(playerGlow);

  // Outer glow sphere
  const glowGeo = new THREE.SphereGeometry(CONFIG.playerRadius * 2, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: COLORS.player,
    transparent: true,
    opacity: 0.2,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  player.add(glowMesh);
}

function createTrails() {
  const count = CONFIG.trailLength;
  trailPositions = new Float32Array(count * 3);

  // Initialize all positions to player start
  for (let i = 0; i < count; i++) {
    trailPositions[i * 3] = 8;
    trailPositions[i * 3 + 1] = 5;
    trailPositions[i * 3 + 2] = 0;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(trailPositions, 3)
  );

  // Size attribute for varying point sizes
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    sizes[i] = (1 - i / count) * 3;
  }
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: COLORS.trail,
    size: 0.08,
    transparent: true,
    opacity: 0.4,
    sizeAttenuation: true,
  });

  trails = new THREE.Points(geometry, material);
  scene.add(trails);
}

function createAmbientParticles() {
  const count = 200;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = CONFIG.singularityRadius + 5 + Math.random() * 20;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x334455,
    size: 0.03,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

// === ENTITY SPAWNING ===
function spawnMemory() {
  if (entities.filter((e) => e.type === 'memory').length >= 15) return;

  // Spawn in orbital ring around singularity
  const angle = Math.random() * Math.PI * 2;
  const distance = CONFIG.singularityRadius + 4 + Math.random() * 12;

  const geometry = new THREE.OctahedronGeometry(0.2, 0);
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.memory,
    transparent: true,
    opacity: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    Math.cos(angle) * distance,
    Math.sin(angle) * distance,
    (Math.random() - 0.5) * 4
  );

  // Add glow
  const glow = new THREE.PointLight(COLORS.memory, 0.5, 3);
  mesh.add(glow);

  scene.add(mesh);

  entities.push({
    mesh,
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      0
    ),
    type: 'memory',
    life: 1,
    maxLife: 10 + Math.random() * 10,
  });
}

function spawnEntropy() {
  if (entities.filter((e) => e.type === 'entropy').length >= 20) return;

  // Spawn from edges, more as depth increases
  const angle = Math.random() * Math.PI * 2;
  const distance = CONFIG.worldRadius;

  // Create jagged geometry
  const geometry = new THREE.TetrahedronGeometry(0.3 + Math.random() * 0.2, 0);
  const material = new THREE.MeshBasicMaterial({
    color: COLORS.entropy,
    transparent: true,
    opacity: 0.7,
    wireframe: Math.random() > 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.set(
    Math.cos(angle) * distance,
    Math.sin(angle) * distance,
    (Math.random() - 0.5) * 6
  );

  scene.add(mesh);

  // Entropy moves toward center
  const toCenter = new THREE.Vector3()
    .subVectors(new THREE.Vector3(0, 0, 0), mesh.position)
    .normalize()
    .multiplyScalar(0.02 + state.depth * 0.001);

  entities.push({
    mesh,
    velocity: toCenter,
    type: 'entropy',
    life: 1,
    maxLife: 15 + Math.random() * 10,
  });
}

// === GAME LOGIC ===
function updatePlayer(delta: number) {
  if (!input.active) return;

  // Convert screen input to world position
  const worldTarget = new THREE.Vector3(
    (input.target.x / window.innerWidth) * 2 - 1,
    -((input.target.y / window.innerHeight) * 2 - 1),
    0
  );

  // Scale to world coordinates
  worldTarget.x *= CONFIG.worldRadius * 0.8;
  worldTarget.y *= CONFIG.worldRadius * 0.8;

  // Move player toward target
  const direction = new THREE.Vector3()
    .subVectors(worldTarget, player.position)
    .normalize();
  const distance = player.position.distanceTo(worldTarget);
  const speed = Math.min(distance, CONFIG.playerSpeed * delta * 60);

  player.position.add(direction.multiplyScalar(speed));

  // Keep player in bounds
  const maxDist = CONFIG.worldRadius - 1;
  if (player.position.length() > maxDist) {
    player.position.normalize().multiplyScalar(maxDist);
  }

  // Prevent entering singularity
  const minDist = CONFIG.singularityRadius + 0.5;
  if (player.position.length() < minDist) {
    player.position.normalize().multiplyScalar(minDist);
  }
}

function updateGravity(delta: number) {
  // Pull player toward center (resisted by input)
  const toCenter = new THREE.Vector3()
    .subVectors(new THREE.Vector3(0, 0, 0), player.position)
    .normalize();

  const distanceFromCenter = player.position.length();
  const gravityForce =
    CONFIG.gravityStrength / Math.max(distanceFromCenter * 0.5, 1);

  if (!input.active) {
    // Stronger pull when not actively moving
    player.position.add(
      toCenter.multiplyScalar(gravityForce * delta * 60 * 0.5)
    );
  } else {
    // Light ambient pull even when moving
    player.position.add(
      toCenter.multiplyScalar(gravityForce * delta * 60 * 0.1)
    );
  }
}

function updateTimeScale() {
  const distanceFromCenter = player.position.length();
  const normalizedDist =
    (distanceFromCenter - CONFIG.singularityRadius) /
    (CONFIG.worldRadius - CONFIG.singularityRadius);

  // Time slows as you approach center (minimum 0.3x speed)
  state.timeScale = 0.3 + normalizedDist * 0.7;

  // Update depth based on closest approach
  const currentDepth =
    ((CONFIG.worldRadius - distanceFromCenter) / CONFIG.worldRadius) * 100;
  state.depth = Math.max(state.depth, currentDepth);
}

function updateTrails() {
  const time = clock.getElapsedTime();
  if (time - lastTrailTime < 0.05) return;

  lastTrailTime = time;

  // Shift all positions
  for (let i = CONFIG.trailLength - 1; i > 0; i--) {
    trailPositions[i * 3] = trailPositions[(i - 1) * 3];
    trailPositions[i * 3 + 1] = trailPositions[(i - 1) * 3 + 1];
    trailPositions[i * 3 + 2] = trailPositions[(i - 1) * 3 + 2];
  }

  // Add new position at start
  trailPositions[0] = player.position.x;
  trailPositions[1] = player.position.y;
  trailPositions[2] = player.position.z;

  trails.geometry.attributes.position.needsUpdate = true;
}

function updateEntities(delta: number) {
  const scaledDelta = delta * state.timeScale;

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];

    // Apply gravity to all entities
    const toCenter = new THREE.Vector3()
      .subVectors(new THREE.Vector3(0, 0, 0), entity.mesh.position)
      .normalize();
    entity.velocity.add(toCenter.multiplyScalar(0.001 * scaledDelta * 60));

    // Move
    entity.mesh.position.add(
      entity.velocity.clone().multiplyScalar(scaledDelta * 60)
    );

    // Rotate
    entity.mesh.rotation.x += 0.02 * scaledDelta * 60;
    entity.mesh.rotation.y += 0.01 * scaledDelta * 60;

    // Decay life
    entity.life -= scaledDelta / entity.maxLife;

    // Fade opacity with life
    (entity.mesh.material as THREE.MeshBasicMaterial).opacity =
      entity.type === 'memory'
        ? 0.9 * entity.life
        : 0.7 * Math.min(entity.life * 2, 1);

    // Check if consumed by singularity
    if (entity.mesh.position.length() < CONFIG.singularityRadius + 0.5) {
      removeEntity(i);
      continue;
    }

    // Check if expired
    if (entity.life <= 0) {
      removeEntity(i);
      continue;
    }

    // Check collision with player
    const distToPlayer = entity.mesh.position.distanceTo(player.position);
    if (distToPlayer < 0.5) {
      if (entity.type === 'memory') {
        collectMemory(i);
      } else {
        hitEntropy();
      }
    }
  }
}

function removeEntity(index: number) {
  const entity = entities[index];
  scene.remove(entity.mesh);
  entity.mesh.geometry.dispose();
  (entity.mesh.material as THREE.Material).dispose();
  entities.splice(index, 1);
}

function collectMemory(index: number) {
  state.memoriesCollected++;
  removeEntity(index);

  // Visual feedback - pulse the player
  playerGlow.intensity = 4;
  setTimeout(() => {
    playerGlow.intensity = 2;
  }, 100);
}

function hitEntropy() {
  // Game over
  state.phase = 'ended';
  showEndScreen();
}

function updateSingularity(delta: number) {
  // Slow rotation
  singularity.rotation.y += 0.1 * delta * state.timeScale;
  singularity.rotation.z += 0.05 * delta * state.timeScale;

  // Pulse children (rings)
  const time = clock.getElapsedTime();
  singularity.children.forEach((ring, i) => {
    ring.rotation.x += 0.02 * (i + 1) * delta * state.timeScale;
    ring.rotation.z += 0.01 * (i + 1) * delta * state.timeScale;
    const scale = 1 + Math.sin(time * 0.5 + i) * 0.1;
    ring.scale.setScalar(scale);
  });
}

function updateCamera() {
  // Gentle camera movement following player
  const targetX = player.position.x * 0.2;
  const targetY = player.position.y * 0.2;

  camera.position.x += (targetX - camera.position.x) * 0.02;
  camera.position.y += (targetY - camera.position.y) * 0.02;

  camera.lookAt(0, 0, 0);
}

function updateUI() {
  const depthEl = document.getElementById('depth-indicator');
  if (depthEl) {
    depthEl.textContent = `depth ${Math.floor(state.depth)}%`;
    depthEl.classList.toggle('visible', state.phase === 'playing');
  }
}

// === EVENT HANDLERS ===
function setupEvents() {
  // Pointer events
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    if (state.phase !== 'playing') return;
    input.active = true;
    input.target.set(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (state.phase !== 'playing' || !input.active) return;
    input.target.set(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerup', () => {
    input.active = false;
  });

  canvas.addEventListener('pointerleave', () => {
    input.active = false;
  });

  // Touch events for mobile
  canvas.addEventListener(
    'touchstart',
    (e) => {
      if (state.phase !== 'playing') return;
      e.preventDefault();
      input.active = true;
      input.target.set(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (state.phase !== 'playing' || !input.active) return;
      e.preventDefault();
      input.target.set(e.touches[0].clientX, e.touches[0].clientY);
    },
    { passive: false }
  );

  canvas.addEventListener('touchend', () => {
    input.active = false;
  });

  // Resize
  window.addEventListener('resize', onResize);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// === UI ===
function setupUI() {
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');

  startBtn?.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', restartGame);
}

function startGame() {
  state.phase = 'playing';
  state.depth = 0;
  state.memoriesCollected = 0;
  state.timePlayed = 0;
  clock.start();

  document.body.classList.add('playing');
  document.getElementById('title-screen')!.style.display = 'none';
}

function restartGame() {
  // Reset player position
  player.position.set(8, 5, 0);

  // Clear entities
  while (entities.length > 0) {
    removeEntity(0);
  }

  // Reset trails
  for (let i = 0; i < CONFIG.trailLength; i++) {
    trailPositions[i * 3] = 8;
    trailPositions[i * 3 + 1] = 5;
    trailPositions[i * 3 + 2] = 0;
  }
  trails.geometry.attributes.position.needsUpdate = true;

  // Hide end screen
  document.getElementById('end-screen')!.classList.remove('visible');

  // Start fresh
  startGame();
}

function showEndScreen() {
  document.body.classList.remove('playing');

  const endScreen = document.getElementById('end-screen')!;
  const statsDiv = endScreen.querySelector('.stats')!;

  statsDiv.innerHTML = `
    Depth reached: <span>${Math.floor(state.depth)}%</span><br>
    Memories saved: <span>${state.memoriesCollected}</span><br>
    Time drifting: <span>${Math.floor(state.timePlayed)}s</span>
  `;

  endScreen.classList.add('visible');
}

// === MAIN LOOP ===
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (state.phase === 'playing') {
    state.timePlayed += delta;

    // Spawn entities
    if (Math.random() < CONFIG.memorySpawnRate) spawnMemory();
    if (Math.random() < CONFIG.entropySpawnRate * (1 + state.depth * 0.02))
      spawnEntropy();

    // Update game
    updateTimeScale();
    updatePlayer(delta * state.timeScale);
    updateGravity(delta * state.timeScale);
    updateEntities(delta);
    updateTrails();
    updateCamera();
    updateUI();
  }

  // Always update visuals
  updateSingularity(delta);

  renderer.render(scene, camera);
}

// === START ===
init();
