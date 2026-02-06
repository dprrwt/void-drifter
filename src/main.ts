import './style.css';
import * as THREE from 'three';

// ============================================
// VOID DRIFTER - Cosmic Space Theme
// UNIQUE design - NOT an Aviator clone!
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

// VOID DRIFTER Color Palette - Cosmic Space Theme
const Colors = {
  // Background gradients
  spaceDeep: 0x0a0a1a,       // Deep space black-blue
  spaceMid: 0x1a1a3a,        // Subtle purple
  
  // Cosmic energy
  nebula: 0x4a1a6b,          // Deep purple nebula
  nebulaGlow: 0x8844aa,      // Purple glow
  
  // Cyan/Teal accent energy
  energy: 0x00ffff,          // Bright cyan
  energyGlow: 0x44ffff,      // Light cyan
  energyDark: 0x00aaaa,      // Dark teal
  
  // Ship - sleek metallic with cyan accents
  ship: {
    body: 0x2a2a4a,          // Dark metallic purple
    bodyLight: 0x4a4a7a,     // Lighter accent
    engine: 0x00ffff,        // Cyan engine glow
    engineDark: 0x008888,    // Darker cyan
    cockpit: 0x88ccff,       // Light blue cockpit
    wing: 0x3a3a5a,          // Wing color
    accent: 0xff00ff,        // Magenta accent
  },
  
  // Pilot - space suit
  pilot: {
    suit: 0x2a2a4a,          // Dark suit
    helmet: 0x88ccff,        // Reflective visor
    visorGlow: 0x00ffff,     // Cyan visor glow
  },
  
  // Collectibles
  orb: {
    core: 0x00ffff,          // Cyan core
    glow: 0x88ffff,          // Light glow
    outer: 0x44aaff,         // Blue outer
  },
  
  // Obstacles - space debris/asteroids
  asteroid: {
    dark: 0x2a1a3a,          // Dark purple rock
    mid: 0x4a2a5a,           // Mid purple
    light: 0x6a4a7a,         // Light purple accent
    crystal: 0xff44ff,       // Magenta crystal
  },
  
  // Particles and effects
  particle: {
    star: 0xffffff,
    trail: 0x00ffff,
    burst: 0xff44ff,
  },
  
  // UI
  ui: {
    text: 0xccccff,          // Light purple-white
    accent: 0x00ffff,        // Cyan
    warning: 0xff4444,       // Red warning
    energyBar: 0x00ffff,     // Cyan bar
  }
};

// Three.js Setup
const scene = new THREE.Scene();

// Deep space fog for depth
scene.fog = new THREE.FogExp2(Colors.spaceDeep, 0.012);
scene.background = new THREE.Color(Colors.spaceDeep);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 8, 25);
camera.lookAt(0, 5, 0);

const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: false 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.querySelector<HTMLDivElement>('#app')!.appendChild(renderer.domElement);

// ============================================
// COSMIC LIGHTING
// ============================================
// Ambient space light (very dim)
const ambientLight = new THREE.AmbientLight(0x1a1a3a, 0.4);
scene.add(ambientLight);

// Main cyan light (like a nearby star)
const mainLight = new THREE.DirectionalLight(0x44aaff, 1.0);
mainLight.position.set(50, 80, 50);
mainLight.castShadow = true;
mainLight.shadow.camera.left = -50;
mainLight.shadow.camera.right = 50;
mainLight.shadow.camera.top = 50;
mainLight.shadow.camera.bottom = -50;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
scene.add(mainLight);

// Purple accent light from below
const accentLight = new THREE.DirectionalLight(0x8844aa, 0.6);
accentLight.position.set(-30, -20, 30);
scene.add(accentLight);

// Rim light
const rimLight = new THREE.DirectionalLight(0x00ffff, 0.4);
rimLight.position.set(0, 50, -50);
scene.add(rimLight);

// ============================================
// STARFIELD (Unique background element)
// ============================================
class Starfield {
  particles: THREE.Points;
  
  constructor() {
    const starCount = 2000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      // Spread stars in a sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 80 + Math.random() * 120;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      
      // Random colors - mostly white with some blue/cyan tints
      const colorChoice = Math.random();
      if (colorChoice < 0.7) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (colorChoice < 0.85) {
        colors[i * 3] = 0.5;
        colors[i * 3 + 1] = 0.8;
        colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 0.8;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 1;
      }
      
      sizes[i] = 0.2 + Math.random() * 0.5;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });
    
    this.particles = new THREE.Points(geometry, material);
  }
  
  update(time: number) {
    // Slow rotation for subtle movement
    this.particles.rotation.y = time * 0.01;
    this.particles.rotation.x = Math.sin(time * 0.02) * 0.02;
  }
}

// ============================================
// COSMIC ENERGY FIELD (Replaces sea)
// ============================================
class CosmicField {
  mesh: THREE.Mesh;
  waves: { x: number; y: number; z: number; ang: number; amp: number; speed: number }[] = [];
  
  constructor() {
    const geom = new THREE.PlaneGeometry(200, 200, 50, 50);
    geom.rotateX(-Math.PI / 2);
    
    // Store wave data
    const positions = geom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      this.waves.push({
        x: positions.getX(i),
        y: positions.getY(i),
        z: positions.getZ(i),
        ang: Math.random() * Math.PI * 2,
        amp: 0.5 + Math.random() * 1.5,
        speed: 0.02 + Math.random() * 0.03
      });
    }
    
    const mat = new THREE.MeshStandardMaterial({
      color: Colors.nebula,
      emissive: Colors.nebulaGlow,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
      wireframe: false,
      roughness: 0.8,
      metalness: 0.2
    });
    
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.y = -8;
    this.mesh.receiveShadow = true;
  }
  
  update(time: number) {
    const positions = this.mesh.geometry.attributes.position;
    
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      const y = Math.sin(wave.ang + time) * wave.amp;
      positions.setY(i, y);
      wave.ang += wave.speed * gameSpeed;
    }
    
    positions.needsUpdate = true;
    
    // Pulse the emissive
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.1 + Math.sin(time * 2) * 0.05;
  }
}

// ============================================
// FLOATING DEBRIS (Decorative background)
// ============================================
class FloatingDebris {
  meshes: THREE.Mesh[] = [];
  
  constructor() {
    const count = 30;
    const geom = new THREE.IcosahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({
      color: Colors.asteroid.dark,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geom, mat.clone());
      
      // Random position in a cylinder around the play area
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 50;
      
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = -5 + Math.random() * 20;
      mesh.position.z = -60 + Math.random() * 80;
      
      const scale = 0.5 + Math.random() * 2;
      mesh.scale.set(scale, scale, scale);
      
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      // Random tint
      const meshMat = mesh.material as THREE.MeshStandardMaterial;
      const tint = Math.random();
      if (tint > 0.7) {
        meshMat.color.setHex(Colors.asteroid.mid);
      } else if (tint > 0.9) {
        meshMat.color.setHex(Colors.asteroid.light);
      }
      
      this.meshes.push(mesh);
    }
  }
  
  update(time: number) {
    this.meshes.forEach((mesh, i) => {
      mesh.rotation.x += 0.002 * (i % 3 + 1);
      mesh.rotation.y += 0.003 * (i % 2 + 1);
      mesh.position.y += Math.sin(time + i) * 0.005;
    });
  }
}

// ============================================
// VOID SHIP (Unique spaceship design)
// ============================================
class VoidShip {
  mesh: THREE.Group;
  engineGlow: THREE.Mesh;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  trails: THREE.Points[] = [];
  
  targetX = 0;
  targetY = 0;
  currentX = 0;
  currentY = 5;
  velocityX = 0;
  velocityY = 0;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Main body - sleek triangular shape
    const bodyGeom = new THREE.ConeGeometry(0.6, 2.5, 4);
    bodyGeom.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: Colors.ship.body,
      roughness: 0.3,
      metalness: 0.8,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    this.mesh.add(body);
    
    // Cockpit dome
    const cockpitGeom = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMat = new THREE.MeshStandardMaterial({
      color: Colors.ship.cockpit,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8
    });
    const cockpit = new THREE.Mesh(cockpitGeom, cockpitMat);
    cockpit.position.set(0, 0.25, 0.3);
    cockpit.rotation.x = -0.3;
    this.mesh.add(cockpit);
    
    // Wings - swept back design
    const wingGeom = new THREE.BoxGeometry(2.5, 0.05, 0.8);
    const wingMat = new THREE.MeshStandardMaterial({
      color: Colors.ship.wing,
      roughness: 0.4,
      metalness: 0.7,
      flatShading: true
    });
    
    this.leftWing = new THREE.Mesh(wingGeom, wingMat);
    this.leftWing.position.set(-0.8, 0, -0.3);
    this.leftWing.rotation.y = 0.3;
    this.leftWing.rotation.z = 0.1;
    this.leftWing.castShadow = true;
    this.mesh.add(this.leftWing);
    
    this.rightWing = new THREE.Mesh(wingGeom, wingMat);
    this.rightWing.position.set(0.8, 0, -0.3);
    this.rightWing.rotation.y = -0.3;
    this.rightWing.rotation.z = -0.1;
    this.rightWing.castShadow = true;
    this.mesh.add(this.rightWing);
    
    // Wing tips - cyan glow accent
    const tipGeom = new THREE.BoxGeometry(0.1, 0.1, 0.6);
    const tipMat = new THREE.MeshStandardMaterial({
      color: Colors.ship.engine,
      emissive: Colors.ship.engine,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    
    const leftTip = new THREE.Mesh(tipGeom, tipMat);
    leftTip.position.set(-1.9, 0, -0.3);
    this.mesh.add(leftTip);
    
    const rightTip = new THREE.Mesh(tipGeom, tipMat);
    rightTip.position.set(1.9, 0, -0.3);
    this.mesh.add(rightTip);
    
    // Engine thruster
    const engineGeom = new THREE.CylinderGeometry(0.25, 0.35, 0.5, 6);
    engineGeom.rotateX(Math.PI / 2);
    const engineMat = new THREE.MeshStandardMaterial({
      color: Colors.ship.engineDark,
      roughness: 0.5,
      metalness: 0.6
    });
    const engine = new THREE.Mesh(engineGeom, engineMat);
    engine.position.z = -1.2;
    this.mesh.add(engine);
    
    // Engine glow
    const glowGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: Colors.ship.engine,
      transparent: true,
      opacity: 0.8
    });
    this.engineGlow = new THREE.Mesh(glowGeom, glowMat);
    this.engineGlow.position.z = -1.4;
    this.engineGlow.scale.z = 1.5;
    this.mesh.add(this.engineGlow);
    
    // Engine point light
    const engineLight = new THREE.PointLight(Colors.ship.engine, 1, 5);
    engineLight.position.z = -1.5;
    this.mesh.add(engineLight);
    
    this.mesh.position.set(0, 5, 0);
    this.mesh.castShadow = true;
  }
  
  update(inputX: number, inputY: number, time: number) {
    // FAST & SNAPPY movement - high responsiveness!
    this.targetX = inputX * 14;
    this.targetY = 5 + inputY * 7;
    
    // Quick acceleration - much snappier than before!
    const acceleration = 0.25; // Was 0.08 - now 3x faster!
    const damping = 0.85;
    
    // Calculate velocity
    this.velocityX += (this.targetX - this.currentX) * acceleration;
    this.velocityY += (this.targetY - this.currentY) * acceleration;
    
    // Apply damping
    this.velocityX *= damping;
    this.velocityY *= damping;
    
    // Update position
    this.currentX += this.velocityX;
    this.currentY += this.velocityY;
    
    // Clamp position
    this.currentX = Math.max(-15, Math.min(15, this.currentX));
    this.currentY = Math.max(1, Math.min(14, this.currentY));
    
    this.mesh.position.x = this.currentX;
    this.mesh.position.y = this.currentY;
    
    // Dynamic banking - ship tilts based on velocity
    this.mesh.rotation.z = -this.velocityX * 0.15;
    this.mesh.rotation.x = -this.velocityY * 0.1;
    
    // Wing flare during movement
    const bankAngle = Math.abs(this.velocityX) * 0.05;
    this.leftWing.rotation.z = 0.1 + bankAngle;
    this.rightWing.rotation.z = -0.1 - bankAngle;
    
    // Engine glow pulsing
    const glowIntensity = 0.8 + Math.sin(time * 15) * 0.2 + gameSpeed * 0.2;
    this.engineGlow.scale.set(1 + Math.sin(time * 20) * 0.1, 1 + Math.sin(time * 20) * 0.1, 1.5 + gameSpeed * 0.3);
    (this.engineGlow.material as THREE.MeshBasicMaterial).opacity = glowIntensity;
    
    // Subtle hover bob
    this.mesh.position.y += Math.sin(time * 4) * 0.05;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

// ============================================
// SPACE OBSTACLES (Asteroids/debris)
// ============================================
class SpaceObstacle {
  mesh: THREE.Group;
  speed: number;
  rotationSpeed: THREE.Vector3;
  passed = false;
  crystals: THREE.Mesh[] = [];
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Main asteroid body
    const size = 1 + Math.random() * 2;
    const geom = new THREE.IcosahedronGeometry(size, 0);
    
    // Distort vertices for irregular shape
    const positions = geom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const offset = 0.7 + Math.random() * 0.6;
      positions.setX(i, positions.getX(i) * offset);
      positions.setY(i, positions.getY(i) * offset);
      positions.setZ(i, positions.getZ(i) * offset);
    }
    geom.computeVertexNormals();
    
    const mat = new THREE.MeshStandardMaterial({
      color: Colors.asteroid.dark,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    
    const asteroid = new THREE.Mesh(geom, mat);
    asteroid.castShadow = true;
    this.mesh.add(asteroid);
    
    // Add small detail rocks
    const detailCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < detailCount; i++) {
      const detailGeom = new THREE.IcosahedronGeometry(size * 0.3, 0);
      const detailMat = new THREE.MeshStandardMaterial({
        color: Math.random() > 0.5 ? Colors.asteroid.mid : Colors.asteroid.light,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true
      });
      
      const detail = new THREE.Mesh(detailGeom, detailMat);
      detail.position.set(
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size,
        (Math.random() - 0.5) * size
      );
      detail.castShadow = true;
      this.mesh.add(detail);
    }
    
    // Occasional glowing crystal
    if (Math.random() > 0.6) {
      const crystalGeom = new THREE.ConeGeometry(0.2, 0.8, 4);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: Colors.asteroid.crystal,
        emissive: Colors.asteroid.crystal,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.8
      });
      
      const crystal = new THREE.Mesh(crystalGeom, crystalMat);
      crystal.position.set(
        (Math.random() - 0.5) * size,
        size * 0.5,
        (Math.random() - 0.5) * size
      );
      crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.crystals.push(crystal);
      this.mesh.add(crystal);
    }
    
    // Position
    this.mesh.position.x = (Math.random() - 0.5) * 28;
    this.mesh.position.y = 2 + Math.random() * 12;
    this.mesh.position.z = -70 - Math.random() * 30;
    
    // Speed - FASTER base speed
    this.speed = 0.6 + Math.random() * 0.3;
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.03,
      (Math.random() - 0.5) * 0.03,
      (Math.random() - 0.5) * 0.02
    );
  }
  
  update(time: number): boolean {
    this.mesh.position.z += this.speed * gameSpeed;
    this.mesh.rotation.x += this.rotationSpeed.x;
    this.mesh.rotation.y += this.rotationSpeed.y;
    this.mesh.rotation.z += this.rotationSpeed.z;
    
    // Pulse crystals
    this.crystals.forEach(crystal => {
      const mat = crystal.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.3 + Math.sin(time * 5) * 0.2;
    });
    
    return this.mesh.position.z > 25;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
  
  destroy() {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}

// ============================================
// ENERGY ORBS (Collectibles)
// ============================================
class EnergyOrb {
  mesh: THREE.Group;
  innerOrb: THREE.Mesh;
  outerRings: THREE.Mesh[] = [];
  speed: number;
  collected = false;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Core orb
    const coreGeom = new THREE.IcosahedronGeometry(0.4, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: Colors.orb.core,
      emissive: Colors.orb.core,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.8
    });
    this.innerOrb = new THREE.Mesh(coreGeom, coreMat);
    this.mesh.add(this.innerOrb);
    
    // Rotating rings
    for (let i = 0; i < 2; i++) {
      const ringGeom = new THREE.TorusGeometry(0.7 + i * 0.2, 0.03, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: Colors.orb.outer,
        emissive: Colors.orb.glow,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.8
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2 + i * 0.5;
      ring.rotation.y = i * 0.3;
      this.outerRings.push(ring);
      this.mesh.add(ring);
    }
    
    // Glow sphere
    const glowGeom = new THREE.SphereGeometry(1, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: Colors.orb.glow,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    this.mesh.add(glow);
    
    // Point light
    const light = new THREE.PointLight(Colors.orb.core, 0.8, 6);
    this.mesh.add(light);
    
    // Position
    this.mesh.position.x = (Math.random() - 0.5) * 24;
    this.mesh.position.y = 3 + Math.random() * 10;
    this.mesh.position.z = -70 - Math.random() * 30;
    
    this.speed = 0.55;
  }
  
  update(time: number): boolean {
    this.mesh.position.z += this.speed * gameSpeed;
    
    // Rotate core and rings
    this.innerOrb.rotation.x += 0.03;
    this.innerOrb.rotation.y += 0.04;
    
    this.outerRings.forEach((ring, i) => {
      ring.rotation.x += 0.02 * (i + 1);
      ring.rotation.z += 0.015 * (i + 1);
    });
    
    // Pulse
    const pulse = 1 + Math.sin(time * 6) * 0.15;
    this.innerOrb.scale.set(pulse, pulse, pulse);
    
    // Bob
    this.mesh.position.y += Math.sin(time * 3.5 + this.mesh.position.x) * 0.025;
    
    return this.mesh.position.z > 25;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
  
  destroy() {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}

// ============================================
// PARTICLE BURST EFFECT
// ============================================
class ParticleBurst {
  particles: THREE.Points;
  velocities: THREE.Vector3[] = [];
  life = 1;
  
  constructor(position: THREE.Vector3, color: number, count = 20) {
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
      size: 0.25,
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
      
      this.velocities[i].multiplyScalar(0.94);
    }
    
    positions.needsUpdate = true;
    this.life -= 0.04;
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
// SPEED LINES (Motion effect)
// ============================================
class SpeedLines {
  lines: THREE.Line[] = [];
  
  constructor() {
    const lineCount = 60;
    const material = new THREE.LineBasicMaterial({
      color: 0x4444aa,
      transparent: true,
      opacity: 0.3
    });
    
    for (let i = 0; i < lineCount; i++) {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -3)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material.clone());
      
      this.resetLine(line);
      this.lines.push(line);
    }
  }
  
  resetLine(line: THREE.Line) {
    line.position.x = (Math.random() - 0.5) * 40;
    line.position.y = Math.random() * 20 - 5;
    line.position.z = -50 - Math.random() * 30;
  }
  
  update() {
    this.lines.forEach(line => {
      line.position.z += 1.5 * gameSpeed;
      (line.material as THREE.LineBasicMaterial).opacity = 0.1 + gameSpeed * 0.15;
      
      if (line.position.z > 20) {
        this.resetLine(line);
      }
    });
  }
}

// ============================================
// GAME OBJECTS
// ============================================
let starfield: Starfield;
let cosmicField: CosmicField;
let floatingDebris: FloatingDebris;
let speedLines: SpeedLines;
let ship: VoidShip;
let obstacles: SpaceObstacle[] = [];
let energyOrbs: EnergyOrb[] = [];
let particles: ParticleBurst[] = [];

// Input
let mouseX = 0;
let mouseY = 0;
let touchX = 0;
let touchY = 0;
let isTouching = false;

// ============================================
// UI - Cosmic Theme
// ============================================
const ui = document.createElement('div');
ui.id = 'ui';
ui.innerHTML = `
  <div id="header">
    <h1>
      <span class="void">VOID</span>
      <span class="title">DRIFTER</span>
    </h1>
    <p class="tagline">// drift through the cosmos //</p>
  </div>
  <div id="score-panel">
    <div class="stat">
      <span class="label">WARP</span>
      <span class="value-box" id="level">1</span>
    </div>
    <div class="stat">
      <span class="label">DISTANCE</span>
      <span class="value" id="distance">000</span>
    </div>
    <div class="stat">
      <span class="label">ENERGY</span>
      <div id="energy-bar">
        <div id="energy-fill"></div>
      </div>
    </div>
  </div>
  <div id="start-screen">
    <div class="content">
      <div class="logo">
        <span class="v">V</span><span class="o">O</span><span class="i">I</span><span class="d">D</span>
      </div>
      <h2>DRIFTER</h2>
      <div class="divider"></div>
      <p>Collect <span class="cyan">energy orbs</span></p>
      <p>Avoid <span class="purple">asteroids</span></p>
      <button id="start-btn">LAUNCH</button>
      <p class="controls">// mouse or touch to steer //</p>
    </div>
  </div>
  <div id="gameover-screen" style="display: none;">
    <div class="content">
      <h2>DRIFT ENDED</h2>
      <div class="divider"></div>
      <p>Distance: <span class="cyan" id="final-distance">0</span></p>
      <p>Best: <span class="purple" id="final-highscore">0</span></p>
      <button id="restart-btn">RELAUNCH</button>
    </div>
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
function init() {
  // Create starfield
  starfield = new Starfield();
  scene.add(starfield.particles);
  
  // Create cosmic energy field
  cosmicField = new CosmicField();
  scene.add(cosmicField.mesh);
  
  // Create floating debris (background)
  floatingDebris = new FloatingDebris();
  floatingDebris.meshes.forEach(mesh => scene.add(mesh));
  
  // Create speed lines
  speedLines = new SpeedLines();
  speedLines.lines.forEach(line => scene.add(line));
}

function startGame() {
  state = GameState.PLAYING;
  score = 0;
  distance = 0;
  energy = 100;
  gameSpeed = 1;
  
  // Clear existing objects
  obstacles.forEach(o => o.destroy());
  energyOrbs.forEach(e => e.destroy());
  particles.forEach(p => {
    scene.remove(p.particles);
    p.particles.geometry.dispose();
    (p.particles.material as THREE.Material).dispose();
  });
  
  obstacles = [];
  energyOrbs = [];
  particles = [];
  
  // Create ship
  if (ship) {
    scene.remove(ship.mesh);
  }
  ship = new VoidShip();
  scene.add(ship.mesh);
  
  // UI updates
  document.getElementById('start-screen')!.style.display = 'none';
  document.getElementById('gameover-screen')!.style.display = 'none';
  document.getElementById('score-panel')!.classList.add('visible');
  document.getElementById('header')!.classList.add('playing');
}

function gameOver() {
  state = GameState.GAMEOVER;
  
  if (Math.floor(distance) > highScore) {
    highScore = Math.floor(distance);
    localStorage.setItem('voidDrifterHighScore', highScore.toString());
  }
  
  document.getElementById('final-distance')!.textContent = Math.floor(distance).toString();
  document.getElementById('final-highscore')!.textContent = highScore.toString();
  document.getElementById('gameover-screen')!.style.display = 'flex';
  document.getElementById('score-panel')!.classList.remove('visible');
}

function spawnObstacle() {
  if (obstacles.length < 15) {
    const obstacle = new SpaceObstacle();
    scene.add(obstacle.mesh);
    obstacles.push(obstacle);
  }
}

function spawnEnergyOrb() {
  if (energyOrbs.length < 5) {
    const orb = new EnergyOrb();
    scene.add(orb.mesh);
    energyOrbs.push(orb);
  }
}

function checkCollisions() {
  if (!ship) return;
  
  const shipBox = ship.getBoundingBox();
  
  // Shrink hitbox slightly for fairness
  shipBox.min.addScalar(0.3);
  shipBox.max.subScalar(0.3);
  
  // Check obstacle collisions
  for (const obstacle of obstacles) {
    const obstacleBox = obstacle.getBoundingBox();
    if (shipBox.intersectsBox(obstacleBox)) {
      energy -= 25;
      particles.push(new ParticleBurst(obstacle.mesh.position.clone(), Colors.asteroid.crystal, 25));
      obstacle.destroy();
      obstacles = obstacles.filter(o => o !== obstacle);
      
      // Camera shake
      camera.position.x += (Math.random() - 0.5) * 0.8;
      camera.position.y += (Math.random() - 0.5) * 0.5;
      
      if (energy <= 0) {
        gameOver();
      }
    }
  }
  
  // Check energy orb collisions
  for (const orb of energyOrbs) {
    const orbBox = orb.getBoundingBox();
    if (shipBox.intersectsBox(orbBox)) {
      score += 100;
      energy = Math.min(100, energy + 12);
      particles.push(new ParticleBurst(orb.mesh.position.clone(), Colors.orb.core, 30));
      orb.destroy();
      energyOrbs = energyOrbs.filter(e => e !== orb);
    }
  }
}

function updateUI() {
  const level = Math.floor(distance / 800) + 1;
  document.getElementById('level')!.textContent = level.toString();
  document.getElementById('distance')!.textContent = Math.floor(distance).toString().padStart(3, '0');
  
  const energyFill = document.getElementById('energy-fill')!;
  energyFill.style.width = `${energy}%`;
  
  // Energy bar color based on amount
  if (energy > 50) {
    energyFill.style.background = 'linear-gradient(90deg, #00ffff, #44ffff)';
  } else if (energy > 25) {
    energyFill.style.background = 'linear-gradient(90deg, #ff8844, #ffaa66)';
  } else {
    energyFill.style.background = 'linear-gradient(90deg, #ff4444, #ff6666)';
  }
}

// ============================================
// ANIMATION LOOP
// ============================================
let lastObstacleSpawn = 0;
let lastOrbSpawn = 0;
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  
  // Update background elements
  starfield?.update(time);
  cosmicField?.update(time);
  floatingDebris?.update(time);
  
  // Smooth camera reset
  camera.position.x += (0 - camera.position.x) * 0.15;
  camera.position.y += (8 - camera.position.y) * 0.15;
  
  if (state === GameState.PLAYING) {
    // Update ship
    const inputX = isTouching ? touchX : mouseX;
    const inputY = isTouching ? touchY : mouseY;
    ship.update(inputX, inputY, time);
    
    // Speed lines update
    speedLines?.update();
    
    // Increase game speed - FASTER progression
    gameSpeed = 1 + distance * 0.00015;
    gameSpeed = Math.min(gameSpeed, 3.0);
    
    // Update distance - FASTER scoring
    distance += gameSpeed * 0.7;
    
    // Spawn objects - MORE FREQUENT
    if (time - lastObstacleSpawn > 0.6 / gameSpeed) {
      spawnObstacle();
      lastObstacleSpawn = time;
    }
    
    if (time - lastOrbSpawn > 2.0) {
      spawnEnergyOrb();
      lastOrbSpawn = time;
    }
    
    // Update obstacles
    obstacles = obstacles.filter(obstacle => {
      if (obstacle.update(time)) {
        obstacle.destroy();
        return false;
      }
      return true;
    });
    
    // Update energy orbs
    energyOrbs = energyOrbs.filter(orb => {
      if (orb.update(time)) {
        orb.destroy();
        return false;
      }
      return true;
    });
    
    // Check collisions
    checkCollisions();
    
    // Update UI
    updateUI();
  } else {
    // Idle animation - gentle speed line movement
    speedLines?.update();
  }
  
  // Update particles
  particles = particles.filter(particle => !particle.update());
  
  renderer.render(scene, camera);
}

// ============================================
// INIT
// ============================================
init();

document.getElementById('start-btn')!.addEventListener('click', startGame);
document.getElementById('restart-btn')!.addEventListener('click', startGame);
document.getElementById('final-highscore')!.textContent = highScore.toString();

// Start animation loop
animate();
