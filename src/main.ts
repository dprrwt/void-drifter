import './style.css';
import * as THREE from 'three';

// ============================================
// VOID DRIFTER - A Low-Poly Space Endless Runner
// ============================================

// Game State
enum GameState {
  START,
  PLAYING,
  GAMEOVER
}

let state = GameState.START;
let score = 0;
let distance = 0;
let energy = 100;
let gameSpeed = 1;
let highScore = parseInt(localStorage.getItem('voidDrifterHighScore') || '0');

// Three.js Setup
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a15, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.querySelector<HTMLDivElement>('#app')!.appendChild(renderer.domElement);

// Colors - Neon Space Theme
const COLORS = {
  ship: 0x00ffff,
  shipGlow: 0x00ffff,
  asteroid: 0x4a4a6a,
  asteroidDark: 0x2a2a4a,
  crystal: 0x00ff88,
  crystalGlow: 0x00ff88,
  trail: 0xff00ff,
  background: 0x0a0a15,
  stars: 0xffffff,
  nebula1: 0x4a0080,
  nebula2: 0x0040a0
};

// ============================================
// LIGHTING
// ============================================
const ambientLight = new THREE.AmbientLight(0x404080, 0.5);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(5, 10, 5);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 1024;
mainLight.shadow.mapSize.height = 1024;
scene.add(mainLight);

const pointLight1 = new THREE.PointLight(0x00ffff, 1, 50);
pointLight1.position.set(-10, 5, -10);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0xff00ff, 0.5, 50);
pointLight2.position.set(10, 5, -20);
scene.add(pointLight2);

// ============================================
// STARFIELD BACKGROUND
// ============================================
function createStarfield(): THREE.Points {
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 200;
    positions[i3 + 1] = (Math.random() - 0.5) * 200;
    positions[i3 + 2] = (Math.random() - 0.5) * 200 - 50;
    
    const color = new THREE.Color();
    color.setHSL(Math.random() * 0.2 + 0.5, 0.5, 0.8 + Math.random() * 0.2);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
    
    sizes[i] = Math.random() * 2 + 0.5;
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starsMaterial = new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  return new THREE.Points(starsGeometry, starsMaterial);
}

const starfield = createStarfield();
scene.add(starfield);

// ============================================
// LOW-POLY SPACESHIP
// ============================================
class Ship {
  mesh: THREE.Group;
  targetX = 0;
  targetY = 0;
  currentX = 0;
  currentY = 0;
  trail: THREE.Points;
  trailPositions: Float32Array;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Main body - elongated octahedron
    const bodyGeom = new THREE.OctahedronGeometry(0.8, 0);
    bodyGeom.scale(1.5, 0.5, 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.ship,
      metalness: 0.8,
      roughness: 0.2,
      emissive: COLORS.shipGlow,
      emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    this.mesh.add(body);
    
    // Wings
    const wingGeom = new THREE.TetrahedronGeometry(0.6, 0);
    wingGeom.scale(2, 0.2, 1);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0088aa,
      metalness: 0.7,
      roughness: 0.3
    });
    
    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.position.set(-1.2, 0, 0.3);
    leftWing.rotation.z = 0.3;
    this.mesh.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeom, wingMat);
    rightWing.position.set(1.2, 0, 0.3);
    rightWing.rotation.z = -0.3;
    this.mesh.add(rightWing);
    
    // Engine glow
    const engineGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const engineMat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });
    const engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.z = 1.5;
    engine.scale.z = 2;
    this.mesh.add(engine);
    
    // Cockpit
    const cockpitGeom = new THREE.SphereGeometry(0.3, 8, 6);
    cockpitGeom.scale(1, 0.8, 1.2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: 0x88ffff,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.6
    });
    const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
    cockpit.position.set(0, 0.3, -0.3);
    this.mesh.add(cockpit);
    
    this.mesh.position.set(0, 0, 5);
    this.mesh.rotation.x = 0.1;
    
    // Trail particles
    this.trailPositions = new Float32Array(90); // 30 particles * 3
    const trailGeom = new THREE.BufferGeometry();
    trailGeom.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    
    const trailMat = new THREE.PointsMaterial({
      color: COLORS.trail,
      size: 0.3,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    
    this.trail = new THREE.Points(trailGeom, trailMat);
    
    scene.add(this.mesh);
    scene.add(this.trail);
  }
  
  update(mouseX: number, mouseY: number) {
    // Smooth follow mouse
    this.targetX = mouseX * 8;
    this.targetY = mouseY * 4;
    
    this.currentX += (this.targetX - this.currentX) * 0.1;
    this.currentY += (this.targetY - this.currentY) * 0.1;
    
    // Clamp position
    this.currentX = Math.max(-10, Math.min(10, this.currentX));
    this.currentY = Math.max(-3, Math.min(5, this.currentY));
    
    this.mesh.position.x = this.currentX;
    this.mesh.position.y = this.currentY;
    
    // Bank based on movement
    this.mesh.rotation.z = -(this.targetX - this.currentX) * 0.1;
    this.mesh.rotation.x = 0.1 + (this.targetY - this.currentY) * 0.05;
    
    // Update trail
    for (let i = this.trailPositions.length - 1; i >= 3; i--) {
      this.trailPositions[i] = this.trailPositions[i - 3];
    }
    this.trailPositions[0] = this.mesh.position.x + (Math.random() - 0.5) * 0.2;
    this.trailPositions[1] = this.mesh.position.y + (Math.random() - 0.5) * 0.2;
    this.trailPositions[2] = this.mesh.position.z + 1.5;
    
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

// ============================================
// LOW-POLY ASTEROIDS
// ============================================
class Asteroid {
  mesh: THREE.Mesh;
  speed: number;
  rotationSpeed: THREE.Vector3;
  passed = false;
  
  constructor() {
    // Random low-poly asteroid
    const size = 0.5 + Math.random() * 1.5;
    const detail = Math.floor(Math.random() * 2);
    const geometry = new THREE.IcosahedronGeometry(size, detail);
    
    // Deform vertices for organic look
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = 0.7 + Math.random() * 0.6;
      positions.setXYZ(i, x * noise, y * noise, z * noise);
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() > 0.5 ? COLORS.asteroid : COLORS.asteroidDark,
      metalness: 0.3,
      roughness: 0.8,
      flatShading: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Random position ahead
    this.mesh.position.x = (Math.random() - 0.5) * 20;
    this.mesh.position.y = (Math.random() - 0.5) * 8;
    this.mesh.position.z = -80 - Math.random() * 40;
    
    this.speed = 0.3 + Math.random() * 0.3;
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    );
    
    scene.add(this.mesh);
  }
  
  update() {
    this.mesh.position.z += this.speed * gameSpeed;
    this.mesh.rotation.x += this.rotationSpeed.x;
    this.mesh.rotation.y += this.rotationSpeed.y;
    this.mesh.rotation.z += this.rotationSpeed.z;
    
    return this.mesh.position.z > 20; // Return true if should be removed
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
  
  destroy() {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

// ============================================
// ENERGY CRYSTALS
// ============================================
class Crystal {
  mesh: THREE.Group;
  speed: number;
  collected = false;
  glowIntensity = 0;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Main crystal body
    const crystalGeom = new THREE.OctahedronGeometry(0.5, 0);
    crystalGeom.scale(0.5, 1.5, 0.5);
    
    const crystalMat = new THREE.MeshStandardMaterial({
      color: COLORS.crystal,
      metalness: 0.9,
      roughness: 0.1,
      emissive: COLORS.crystalGlow,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    
    const crystal = new THREE.Mesh(crystalGeom, crystalMat);
    this.mesh.add(crystal);
    
    // Glow sphere
    const glowGeom = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: COLORS.crystalGlow,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.mesh.add(glow);
    
    // Random position ahead
    this.mesh.position.x = (Math.random() - 0.5) * 16;
    this.mesh.position.y = (Math.random() - 0.5) * 6;
    this.mesh.position.z = -80 - Math.random() * 40;
    
    this.speed = 0.35;
    
    scene.add(this.mesh);
  }
  
  update(time: number) {
    this.mesh.position.z += this.speed * gameSpeed;
    this.mesh.rotation.y += 0.03;
    this.mesh.rotation.z = Math.sin(time * 3) * 0.2;
    
    // Pulse effect
    this.glowIntensity = 0.3 + Math.sin(time * 5) * 0.2;
    const mat = (this.mesh.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = this.glowIntensity;
    
    return this.mesh.position.z > 20;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
  
  destroy() {
    scene.remove(this.mesh);
    this.mesh.children.forEach(child => {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
  }
}

// ============================================
// PARTICLE EXPLOSION
// ============================================
class Explosion {
  particles: THREE.Points;
  velocities: THREE.Vector3[] = [];
  life = 1;
  
  constructor(position: THREE.Vector3, color: number) {
    const count = 30;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ));
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.3,
      transparent: true,
      opacity: 1
    });
    
    this.particles = new THREE.Points(geometry, material);
    scene.add(this.particles);
  }
  
  update(): boolean {
    const positions = this.particles.geometry.attributes.position;
    
    for (let i = 0; i < this.velocities.length; i++) {
      positions.setX(i, positions.getX(i) + this.velocities[i].x);
      positions.setY(i, positions.getY(i) + this.velocities[i].y);
      positions.setZ(i, positions.getZ(i) + this.velocities[i].z);
    }
    
    positions.needsUpdate = true;
    this.life -= 0.02;
    (this.particles.material as THREE.PointsMaterial).opacity = this.life;
    
    if (this.life <= 0) {
      scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      return true;
    }
    return false;
  }
}

// ============================================
// GAME OBJECTS
// ============================================
let ship: Ship;
let asteroids: Asteroid[] = [];
let crystals: Crystal[] = [];
let explosions: Explosion[] = [];

// Mouse position (-1 to 1)
let mouseX = 0;
let mouseY = 0;

// Touch position
let touchX = 0;
let touchY = 0;
let isTouching = false;

// ============================================
// UI
// ============================================
const ui = document.createElement('div');
ui.id = 'ui';
ui.innerHTML = `
  <div id="score-panel">
    <div class="stat">
      <span class="label">SCORE</span>
      <span id="score">0</span>
    </div>
    <div class="stat">
      <span class="label">DISTANCE</span>
      <span id="distance">0</span>
    </div>
    <div class="stat">
      <span class="label">HIGH</span>
      <span id="highscore">0</span>
    </div>
  </div>
  <div id="energy-bar">
    <div id="energy-fill"></div>
  </div>
  <div id="start-screen">
    <h1>VOID DRIFTER</h1>
    <p>Navigate the asteroid field</p>
    <p>Collect crystals • Avoid asteroids</p>
    <button id="start-btn">START</button>
    <p class="controls">Mouse / Touch to steer</p>
  </div>
  <div id="gameover-screen" style="display: none;">
    <h1>GAME OVER</h1>
    <p>Score: <span id="final-score">0</span></p>
    <p>High Score: <span id="final-highscore">0</span></p>
    <button id="restart-btn">PLAY AGAIN</button>
  </div>
`;
document.body.appendChild(ui);

// ============================================
// EVENT LISTENERS
// ============================================
function onMouseMove(e: MouseEvent) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length > 0) {
    touchX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    touchY = -((e.touches[0].clientY / window.innerHeight) * 2 - 1);
    isTouching = true;
  }
}

function onTouchEnd() {
  isTouching = false;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('touchmove', onTouchMove, { passive: true });
window.addEventListener('touchend', onTouchEnd);
window.addEventListener('resize', onResize);

// ============================================
// GAME FUNCTIONS
// ============================================
function startGame() {
  state = GameState.PLAYING;
  score = 0;
  distance = 0;
  energy = 100;
  gameSpeed = 1;
  
  // Clear existing objects
  asteroids.forEach(a => a.destroy());
  crystals.forEach(c => c.destroy());
  explosions.forEach(e => {
    scene.remove(e.particles);
    e.particles.geometry.dispose();
    (e.particles.material as THREE.Material).dispose();
  });
  
  asteroids = [];
  crystals = [];
  explosions = [];
  
  // Create ship
  if (ship) {
    scene.remove(ship.mesh);
    scene.remove(ship.trail);
  }
  ship = new Ship();
  
  document.getElementById('start-screen')!.style.display = 'none';
  document.getElementById('gameover-screen')!.style.display = 'none';
  document.getElementById('score-panel')!.style.opacity = '1';
  document.getElementById('energy-bar')!.style.opacity = '1';
}

function gameOver() {
  state = GameState.GAMEOVER;
  
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('voidDrifterHighScore', highScore.toString());
  }
  
  document.getElementById('final-score')!.textContent = score.toString();
  document.getElementById('final-highscore')!.textContent = highScore.toString();
  document.getElementById('gameover-screen')!.style.display = 'flex';
}

function spawnAsteroid() {
  if (asteroids.length < 15) {
    asteroids.push(new Asteroid());
  }
}

function spawnCrystal() {
  if (crystals.length < 5) {
    crystals.push(new Crystal());
  }
}

function checkCollisions() {
  if (!ship) return;
  
  const shipBox = ship.getBoundingBox();
  
  // Check asteroid collisions
  for (const asteroid of asteroids) {
    const asteroidBox = asteroid.getBoundingBox();
    if (shipBox.intersectsBox(asteroidBox)) {
      energy -= 25;
      explosions.push(new Explosion(asteroid.mesh.position.clone(), 0xff4400));
      asteroid.destroy();
      asteroids = asteroids.filter(a => a !== asteroid);
      
      if (energy <= 0) {
        gameOver();
      }
    }
  }
  
  // Check crystal collisions
  for (const crystal of crystals) {
    const crystalBox = crystal.getBoundingBox();
    if (shipBox.intersectsBox(crystalBox)) {
      score += 100;
      energy = Math.min(100, energy + 10);
      explosions.push(new Explosion(crystal.mesh.position.clone(), COLORS.crystalGlow));
      crystal.destroy();
      crystals = crystals.filter(c => c !== crystal);
    }
  }
}

function updateUI() {
  document.getElementById('score')!.textContent = score.toString();
  document.getElementById('distance')!.textContent = Math.floor(distance).toString();
  document.getElementById('highscore')!.textContent = highScore.toString();
  document.getElementById('energy-fill')!.style.width = `${energy}%`;
  
  // Change energy bar color based on level
  const fill = document.getElementById('energy-fill')!;
  if (energy > 50) {
    fill.style.background = 'linear-gradient(90deg, #00ff88, #00ffaa)';
  } else if (energy > 25) {
    fill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
  } else {
    fill.style.background = 'linear-gradient(90deg, #ff4400, #ff6600)';
  }
}

// ============================================
// ANIMATION LOOP
// ============================================
let lastAsteroidSpawn = 0;
let lastCrystalSpawn = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  const delta = clock.getDelta();
  
  // Animate starfield
  starfield.rotation.z += 0.0001;
  
  // Animate lights
  pointLight1.position.x = Math.sin(time * 0.5) * 15;
  pointLight2.position.x = Math.cos(time * 0.3) * 15;
  
  if (state === GameState.PLAYING) {
    // Update ship
    const inputX = isTouching ? touchX : mouseX;
    const inputY = isTouching ? touchY : mouseY;
    ship.update(inputX, inputY);
    
    // Update game speed
    gameSpeed = 1 + distance * 0.0002;
    gameSpeed = Math.min(gameSpeed, 3);
    
    // Update distance & score
    distance += gameSpeed;
    score += Math.floor(gameSpeed);
    
    // Spawn objects
    if (time - lastAsteroidSpawn > 0.5 / gameSpeed) {
      spawnAsteroid();
      lastAsteroidSpawn = time;
    }
    
    if (time - lastCrystalSpawn > 2) {
      spawnCrystal();
      lastCrystalSpawn = time;
    }
    
    // Update asteroids
    asteroids = asteroids.filter(asteroid => {
      if (asteroid.update()) {
        if (!asteroid.passed) {
          asteroid.passed = true;
        }
        asteroid.destroy();
        return false;
      }
      return true;
    });
    
    // Update crystals
    crystals = crystals.filter(crystal => {
      if (crystal.update(time)) {
        crystal.destroy();
        return false;
      }
      return true;
    });
    
    // Check collisions
    checkCollisions();
    
    // Update UI
    updateUI();
  }
  
  // Update explosions
  explosions = explosions.filter(explosion => !explosion.update());
  
  renderer.render(scene, camera);
}

// ============================================
// INIT
// ============================================
document.getElementById('start-btn')!.addEventListener('click', startGame);
document.getElementById('restart-btn')!.addEventListener('click', startGame);
document.getElementById('highscore')!.textContent = highScore.toString();

// Start animation loop
animate();
