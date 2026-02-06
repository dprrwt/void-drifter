import './style.css';
import * as THREE from 'three';

// ============================================
// VOID DRIFTER - Aviator-Style Visual Overhaul
// Inspired by The Aviator (tympanus.net)
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

// Aviator-inspired Color Palette
const Colors = {
  sky: 0xf7d9aa,           // Warm cream sky
  skyHorizon: 0xf9e5c9,    // Lighter horizon
  sun: 0xffede1,           // Soft sun glow
  
  sea: 0x68c3c0,           // Soft teal
  seaLight: 0x84d4d1,      // Light teal highlights
  
  cloud: 0xd8d0d1,         // Soft gray-pink clouds
  cloudLight: 0xffffff,    // Cloud highlights
  cloudDark: 0xb5a9ab,     // Cloud shadows
  
  plane: {
    body: 0xf25346,        // Warm red
    bodyDark: 0xd44131,    // Darker red
    engine: 0x59332e,      // Brown
    propeller: 0x23190f,   // Dark brown
    blade: 0x23190f,       // Blade color
    cockpit: 0xf5986e,     // Peach
    wing: 0xffffff,        // White wings
  },
  
  pilot: {
    skin: 0xf5d6c6,        // Skin tone
    hair: 0x59332e,        // Brown hair
    glass: 0xffffff,       // Goggles
    glassDark: 0x333333,   // Goggle frame
  },
  
  energy: {
    orb: 0x7ec8e3,         // Soft blue energy
    orbGlow: 0xaee1f9,     // Light blue glow
  },
  
  obstacle: {
    rock: 0xd4a373,        // Sandy rock
    rockDark: 0xbc8f5e,    // Darker rock
    rockLight: 0xe5c9a8,   // Light rock
  },
  
  ui: {
    text: 0x594034,        // Brown text
    accent: 0xf25346,      // Red accent
    energy: 0x68c3c0,      // Teal energy bar
  }
};

// Three.js Setup
const scene = new THREE.Scene();

// Soft fog for atmosphere
scene.fog = new THREE.Fog(Colors.sky, 40, 100);
scene.background = new THREE.Color(Colors.sky);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 10, 30);
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
renderer.toneMappingExposure = 1.2;
document.querySelector<HTMLDivElement>('#app')!.appendChild(renderer.domElement);

// ============================================
// SOFT LIGHTING (Aviator-style)
// ============================================
const hemisphereLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.9);
scene.add(hemisphereLight);

const ambientLight = new THREE.AmbientLight(0xfff4e6, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff4e6, 1.2);
sunLight.position.set(100, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 400;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.bias = -0.0001;
scene.add(sunLight);

// Warm fill light
const fillLight = new THREE.DirectionalLight(0xf7d9aa, 0.4);
fillLight.position.set(-100, 50, -100);
scene.add(fillLight);

// ============================================
// SEA (Rotating cylinder like Aviator)
// ============================================
class Sea {
  mesh: THREE.Mesh;
  waves: { x: number; y: number; z: number; ang: number; amp: number; speed: number }[] = [];
  
  constructor() {
    const geom = new THREE.CylinderGeometry(600, 600, 800, 40, 10);
    geom.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
    
    // Store wave info for each vertex
    const positions = geom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      this.waves.push({
        x: positions.getX(i),
        y: positions.getY(i),
        z: positions.getZ(i),
        ang: Math.random() * Math.PI * 2,
        amp: 2 + Math.random() * 5,
        speed: 0.016 + Math.random() * 0.032
      });
    }
    
    const mat = new THREE.MeshPhongMaterial({
      color: Colors.sea,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
      shininess: 10
    });
    
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.position.y = -600;
    this.mesh.receiveShadow = true;
  }
  
  update() {
    const positions = this.mesh.geometry.attributes.position;
    
    for (let i = 0; i < this.waves.length; i++) {
      const wave = this.waves[i];
      const x = wave.x + Math.cos(wave.ang) * wave.amp;
      const y = wave.y + Math.sin(wave.ang) * wave.amp;
      
      positions.setX(i, x);
      positions.setY(i, y);
      
      wave.ang += wave.speed;
    }
    
    positions.needsUpdate = true;
    this.mesh.rotation.z += 0.003 * gameSpeed;
  }
}

// ============================================
// SKY (Gradient sphere)
// ============================================
class Sky {
  mesh: THREE.Mesh;
  clouds: Cloud[] = [];
  
  constructor() {
    // Create a gradient sky dome
    const skyGeo = new THREE.SphereGeometry(400, 32, 32);
    
    // Create gradient material
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;
    
    const uniforms = {
      topColor: { value: new THREE.Color(0xf7d9aa) },
      bottomColor: { value: new THREE.Color(0xfef9f3) },
      offset: { value: 33 },
      exponent: { value: 0.4 }
    };
    
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });
    
    this.mesh = new THREE.Mesh(skyGeo, skyMat);
    
    // Add clouds
    const nClouds = 25;
    const stepAngle = Math.PI * 2 / nClouds;
    
    for (let i = 0; i < nClouds; i++) {
      const cloud = new Cloud();
      
      const a = stepAngle * i;
      const h = 750 + Math.random() * 200;
      
      cloud.mesh.position.y = Math.sin(a) * h;
      cloud.mesh.position.x = Math.cos(a) * h;
      cloud.mesh.position.z = -300 - Math.random() * 500;
      cloud.mesh.rotation.z = a + Math.PI / 2;
      
      const s = 1 + Math.random() * 2;
      cloud.mesh.scale.set(s, s, s);
      
      this.clouds.push(cloud);
      this.mesh.add(cloud.mesh);
    }
  }
  
  update() {
    for (const cloud of this.clouds) {
      cloud.mesh.rotation.y += 0.001 * gameSpeed;
    }
  }
}

// ============================================
// CLOUD (Puffy low-poly cloud)
// ============================================
class Cloud {
  mesh: THREE.Group;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    const geom = new THREE.BoxGeometry(20, 20, 20);
    const mat = new THREE.MeshPhongMaterial({
      color: Colors.cloud,
      flatShading: true
    });
    
    const nBlocks = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < nBlocks; i++) {
      const m = new THREE.Mesh(geom, mat);
      
      m.position.x = i * 15;
      m.position.y = Math.random() * 10;
      m.position.z = Math.random() * 10;
      m.rotation.z = Math.random() * Math.PI * 2;
      m.rotation.y = Math.random() * Math.PI * 2;
      
      const s = 0.1 + Math.random() * 0.9;
      m.scale.set(s, s, s);
      
      m.castShadow = true;
      m.receiveShadow = true;
      
      this.mesh.add(m);
    }
  }
}

// ============================================
// AIRPLANE (Aviator-style playful design)
// ============================================
class Airplane {
  mesh: THREE.Group;
  propeller: THREE.Mesh;
  pilot: THREE.Group;
  
  targetX = 0;
  targetY = 0;
  currentX = 0;
  currentY = 5;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Cabin
    const geomCabin = new THREE.BoxGeometry(80, 50, 50, 1, 1, 1);
    const positions = geomCabin.attributes.position;
    
    // Make cabin more aerodynamic
    // Front vertices (positive x)
    positions.setY(4, positions.getY(4) - 10);
    positions.setZ(4, positions.getZ(4) + 20);
    positions.setY(5, positions.getY(5) - 10);
    positions.setZ(5, positions.getZ(5) - 20);
    positions.setY(6, positions.getY(6) + 30);
    positions.setZ(6, positions.getZ(6) + 20);
    positions.setY(7, positions.getY(7) + 30);
    positions.setZ(7, positions.getZ(7) - 20);
    
    const matCabin = new THREE.MeshPhongMaterial({
      color: Colors.plane.body,
      flatShading: true
    });
    
    const cabin = new THREE.Mesh(geomCabin, matCabin);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    this.mesh.add(cabin);
    
    // Engine
    const geomEngine = new THREE.BoxGeometry(20, 50, 50);
    const matEngine = new THREE.MeshPhongMaterial({
      color: Colors.plane.engine,
      flatShading: true
    });
    const engine = new THREE.Mesh(geomEngine, matEngine);
    engine.position.x = 50;
    engine.castShadow = true;
    engine.receiveShadow = true;
    this.mesh.add(engine);
    
    // Tail plane
    const geomTailPlane = new THREE.BoxGeometry(15, 20, 5);
    const matTailPlane = new THREE.MeshPhongMaterial({
      color: Colors.plane.body,
      flatShading: true
    });
    const tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
    tailPlane.position.set(-40, 20, 0);
    tailPlane.castShadow = true;
    tailPlane.receiveShadow = true;
    this.mesh.add(tailPlane);
    
    // Tail wing
    const geomSideWing = new THREE.BoxGeometry(40, 5, 150);
    const matSideWing = new THREE.MeshPhongMaterial({
      color: Colors.plane.wing,
      flatShading: true
    });
    const tailWing = new THREE.Mesh(geomSideWing, matSideWing);
    tailWing.position.set(-40, 5, 0);
    tailWing.castShadow = true;
    tailWing.receiveShadow = true;
    this.mesh.add(tailWing);
    
    // Main wing
    const geomMainWing = new THREE.BoxGeometry(30, 5, 200);
    const mainWing = new THREE.Mesh(geomMainWing, matSideWing);
    mainWing.position.set(0, 15, 0);
    mainWing.castShadow = true;
    mainWing.receiveShadow = true;
    this.mesh.add(mainWing);
    
    // Propeller
    const geomPropeller = new THREE.BoxGeometry(20, 10, 10);
    const matPropeller = new THREE.MeshPhongMaterial({
      color: Colors.plane.propeller,
      flatShading: true
    });
    this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
    
    // Propeller blades
    const geomBlade = new THREE.BoxGeometry(1, 80, 10);
    const matBlade = new THREE.MeshPhongMaterial({
      color: Colors.plane.blade,
      flatShading: true
    });
    const blade1 = new THREE.Mesh(geomBlade, matBlade);
    blade1.position.set(8, 0, 0);
    blade1.castShadow = true;
    blade1.receiveShadow = true;
    this.propeller.add(blade1);
    
    const blade2 = new THREE.Mesh(geomBlade, matBlade);
    blade2.position.set(8, 0, 0);
    blade2.rotation.x = Math.PI / 2;
    blade2.castShadow = true;
    blade2.receiveShadow = true;
    this.propeller.add(blade2);
    
    this.propeller.position.set(60, 0, 0);
    this.propeller.castShadow = true;
    this.propeller.receiveShadow = true;
    this.mesh.add(this.propeller);
    
    // Cockpit glass
    const geomCockpit = new THREE.BoxGeometry(36, 30, 35);
    const matCockpit = new THREE.MeshPhongMaterial({
      color: Colors.plane.cockpit,
      transparent: true,
      opacity: 0.6,
      flatShading: true
    });
    const cockpit = new THREE.Mesh(geomCockpit, matCockpit);
    cockpit.position.set(-5, 27, 0);
    cockpit.castShadow = true;
    cockpit.receiveShadow = true;
    this.mesh.add(cockpit);
    
    // Wheels
    const wheelProtecGeom = new THREE.BoxGeometry(30, 15, 10);
    const wheelProtecMat = new THREE.MeshPhongMaterial({
      color: Colors.plane.body,
      flatShading: true
    });
    const wheelProtecR = new THREE.Mesh(wheelProtecGeom, wheelProtecMat);
    wheelProtecR.position.set(25, -20, 25);
    this.mesh.add(wheelProtecR);
    
    const wheelProtecL = wheelProtecR.clone();
    wheelProtecL.position.z = -25;
    this.mesh.add(wheelProtecL);
    
    const wheelTireGeom = new THREE.BoxGeometry(24, 24, 8);
    const wheelTireMat = new THREE.MeshPhongMaterial({
      color: Colors.plane.engine,
      flatShading: true
    });
    const wheelTireR = new THREE.Mesh(wheelTireGeom, wheelTireMat);
    wheelTireR.position.set(25, -28, 25);
    this.mesh.add(wheelTireR);
    
    const wheelTireL = wheelTireR.clone();
    wheelTireL.position.z = -25;
    this.mesh.add(wheelTireL);
    
    // Back wheel
    const wheelTireB = new THREE.Mesh(wheelTireGeom, wheelTireMat);
    wheelTireB.scale.set(0.5, 0.5, 0.5);
    wheelTireB.position.set(-35, -10, 0);
    this.mesh.add(wheelTireB);
    
    // Suspension
    const suspensionGeom = new THREE.BoxGeometry(4, 20, 4);
    const suspensionMat = new THREE.MeshPhongMaterial({
      color: Colors.plane.body,
      flatShading: true
    });
    const suspension = new THREE.Mesh(suspensionGeom, suspensionMat);
    suspension.position.set(-35, -5, 0);
    suspension.rotation.z = -0.3;
    this.mesh.add(suspension);
    
    // Add pilot
    this.pilot = this.createPilot();
    this.pilot.position.set(-10, 27, 0);
    this.pilot.scale.set(0.8, 0.8, 0.8);
    this.mesh.add(this.pilot);
    
    // Scale down the plane
    this.mesh.scale.set(0.04, 0.04, 0.04);
    this.mesh.position.set(0, 5, 0);
    this.mesh.rotation.y = Math.PI;
    
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }
  
  createPilot(): THREE.Group {
    const pilot = new THREE.Group();
    
    // Body
    const bodyGeom = new THREE.BoxGeometry(15, 15, 15);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: Colors.plane.body,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.set(2, -12, 0);
    pilot.add(body);
    
    // Face
    const faceGeom = new THREE.BoxGeometry(10, 10, 10);
    const faceMat = new THREE.MeshPhongMaterial({
      color: Colors.pilot.skin,
      flatShading: true
    });
    const face = new THREE.Mesh(faceGeom, faceMat);
    pilot.add(face);
    
    // Hair
    const hairGeom = new THREE.BoxGeometry(4, 4, 4);
    const hairMat = new THREE.MeshPhongMaterial({
      color: Colors.pilot.hair,
      flatShading: true
    });
    const hairSideR = new THREE.Mesh(hairGeom, hairMat);
    hairSideR.position.set(-3, 5, 6);
    pilot.add(hairSideR);
    
    const hairSideL = hairSideR.clone();
    hairSideL.position.z = -6;
    pilot.add(hairSideL);
    
    const hairBack = new THREE.Mesh(hairGeom, hairMat);
    hairBack.position.set(-2, 5, 0);
    hairBack.scale.set(1, 1, 2);
    pilot.add(hairBack);
    
    const hairTop = new THREE.Mesh(hairGeom, hairMat);
    hairTop.position.set(-1, 8, 0);
    hairTop.scale.set(1, 1, 2);
    pilot.add(hairTop);
    
    // Goggles
    const glassGeom = new THREE.BoxGeometry(5, 5, 5);
    const glassMat = new THREE.MeshPhongMaterial({
      color: Colors.pilot.glass,
      flatShading: true
    });
    const glassR = new THREE.Mesh(glassGeom, glassMat);
    glassR.position.set(6, 0, 3);
    pilot.add(glassR);
    
    const glassL = glassR.clone();
    glassL.position.z = -3;
    pilot.add(glassL);
    
    const glassFrame = new THREE.Mesh(new THREE.BoxGeometry(7, 5, 13), 
      new THREE.MeshPhongMaterial({
        color: Colors.pilot.glassDark,
        flatShading: true
      }));
    glassFrame.position.set(3, 0, 0);
    pilot.add(glassFrame);
    
    // Ear
    const earGeom = new THREE.BoxGeometry(2, 3, 2);
    const earR = new THREE.Mesh(earGeom, faceMat);
    earR.position.set(0, 0, 6);
    pilot.add(earR);
    
    const earL = earR.clone();
    earL.position.z = -6;
    pilot.add(earL);
    
    return pilot;
  }
  
  update(inputX: number, inputY: number, time: number) {
    // Smooth follow mouse
    this.targetX = inputX * 10;
    this.targetY = 5 + inputY * 5;
    
    this.currentX += (this.targetX - this.currentX) * 0.08;
    this.currentY += (this.targetY - this.currentY) * 0.08;
    
    // Clamp position
    this.currentX = Math.max(-12, Math.min(12, this.currentX));
    this.currentY = Math.max(1, Math.min(12, this.currentY));
    
    this.mesh.position.x = this.currentX;
    this.mesh.position.y = this.currentY;
    
    // Gentle banking based on movement
    this.mesh.rotation.z = (this.targetX - this.currentX) * 0.03;
    this.mesh.rotation.x = (this.currentY - this.targetY) * 0.02;
    
    // Subtle bobbing motion
    this.mesh.position.y += Math.sin(time * 2) * 0.1;
    
    // Spin propeller
    this.propeller.rotation.x += 0.3 + gameSpeed * 0.2;
    
    // Pilot hair animation
    const hairParts = [
      this.pilot.children[2],
      this.pilot.children[3],
      this.pilot.children[4],
      this.pilot.children[5]
    ];
    hairParts.forEach((hair, i) => {
      hair.scale.y = 0.75 + Math.cos(time * 10 + i) * 0.15;
    });
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
}

// ============================================
// FLOATING OBSTACLES (Soft cubes like Aviator)
// ============================================
class Obstacle {
  mesh: THREE.Group;
  speed: number;
  rotationSpeed: THREE.Vector3;
  passed = false;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    const size = 1 + Math.random() * 2;
    const geom = new THREE.BoxGeometry(size, size, size);
    
    const colorChoice = Math.random();
    let color;
    if (colorChoice < 0.33) {
      color = Colors.obstacle.rock;
    } else if (colorChoice < 0.66) {
      color = Colors.obstacle.rockDark;
    } else {
      color = Colors.obstacle.rockLight;
    }
    
    const mat = new THREE.MeshPhongMaterial({
      color: color,
      flatShading: true
    });
    
    // Create cluster of blocks
    const nBlocks = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < nBlocks; i++) {
      const block = new THREE.Mesh(geom, mat);
      
      block.position.x = Math.random() * size;
      block.position.y = Math.random() * size;
      block.position.z = Math.random() * size;
      
      block.rotation.x = Math.random() * Math.PI;
      block.rotation.y = Math.random() * Math.PI;
      
      const s = 0.3 + Math.random() * 0.7;
      block.scale.set(s, s, s);
      
      block.castShadow = true;
      block.receiveShadow = true;
      
      this.mesh.add(block);
    }
    
    // Random position ahead
    this.mesh.position.x = (Math.random() - 0.5) * 25;
    this.mesh.position.y = 2 + Math.random() * 10;
    this.mesh.position.z = -80 - Math.random() * 40;
    
    this.speed = 0.4 + Math.random() * 0.2;
    this.rotationSpeed = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.01
    );
  }
  
  update(): boolean {
    this.mesh.position.z += this.speed * gameSpeed;
    this.mesh.rotation.x += this.rotationSpeed.x;
    this.mesh.rotation.y += this.rotationSpeed.y;
    this.mesh.rotation.z += this.rotationSpeed.z;
    
    return this.mesh.position.z > 30;
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
// ENERGY ORBS (Soft glowing collectibles)
// ============================================
class EnergyOrb {
  mesh: THREE.Group;
  innerOrb: THREE.Mesh;
  outerGlow: THREE.Mesh;
  speed: number;
  collected = false;
  
  constructor() {
    this.mesh = new THREE.Group();
    
    // Inner sphere
    const innerGeom = new THREE.IcosahedronGeometry(0.5, 1);
    const innerMat = new THREE.MeshPhongMaterial({
      color: Colors.energy.orb,
      emissive: Colors.energy.orb,
      emissiveIntensity: 0.5,
      flatShading: true,
      transparent: true,
      opacity: 0.9
    });
    this.innerOrb = new THREE.Mesh(innerGeom, innerMat);
    this.mesh.add(this.innerOrb);
    
    // Outer glow
    const outerGeom = new THREE.SphereGeometry(1, 16, 16);
    const outerMat = new THREE.MeshBasicMaterial({
      color: Colors.energy.orbGlow,
      transparent: true,
      opacity: 0.2
    });
    this.outerGlow = new THREE.Mesh(outerGeom, outerMat);
    this.mesh.add(this.outerGlow);
    
    // Position
    this.mesh.position.x = (Math.random() - 0.5) * 20;
    this.mesh.position.y = 3 + Math.random() * 8;
    this.mesh.position.z = -80 - Math.random() * 40;
    
    this.speed = 0.45;
  }
  
  update(time: number): boolean {
    this.mesh.position.z += this.speed * gameSpeed;
    
    // Rotate and pulse
    this.innerOrb.rotation.x += 0.02;
    this.innerOrb.rotation.y += 0.03;
    
    const pulse = 1 + Math.sin(time * 5) * 0.1;
    this.outerGlow.scale.set(pulse, pulse, pulse);
    
    // Gentle bob
    this.mesh.position.y += Math.sin(time * 3 + this.mesh.position.x) * 0.02;
    
    return this.mesh.position.z > 30;
  }
  
  getBoundingBox(): THREE.Box3 {
    return new THREE.Box3().setFromObject(this.mesh);
  }
  
  destroy() {
    scene.remove(this.mesh);
    this.innerOrb.geometry.dispose();
    (this.innerOrb.material as THREE.Material).dispose();
    this.outerGlow.geometry.dispose();
    (this.outerGlow.material as THREE.Material).dispose();
  }
}

// ============================================
// PARTICLE BURST (Collection/collision effect)
// ============================================
class ParticleBurst {
  particles: THREE.Points;
  velocities: THREE.Vector3[] = [];
  life = 1;
  
  constructor(position: THREE.Vector3, color: number, count = 15) {
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      
      this.velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ));
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.2,
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
      
      // Slow down
      this.velocities[i].multiplyScalar(0.96);
    }
    
    positions.needsUpdate = true;
    this.life -= 0.03;
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
let sky: Sky;
let sea: Sea;
let airplane: Airplane;
let obstacles: Obstacle[] = [];
let energyOrbs: EnergyOrb[] = [];
let particles: ParticleBurst[] = [];

// Input
let mouseX = 0;
let mouseY = 0;
let touchX = 0;
let touchY = 0;
let isTouching = false;

// ============================================
// UI (Aviator-style clean and minimal)
// ============================================
const ui = document.createElement('div');
ui.id = 'ui';
ui.innerHTML = `
  <div id="header">
    <h1>
      <span class="the">the</span>
      <span class="title">Drifter</span>
    </h1>
    <p class="tagline">fly it to the end</p>
  </div>
  <div id="score-panel">
    <div class="stat">
      <span class="label">level</span>
      <span class="circle" id="level">1</span>
    </div>
    <div class="stat">
      <span class="label">distance</span>
      <span id="distance">000</span>
    </div>
    <div class="stat">
      <span class="label">energy</span>
      <div id="energy-bar">
        <div id="energy-fill"></div>
      </div>
    </div>
  </div>
  <div id="start-screen">
    <div class="content">
      <h2>Ready to Drift?</h2>
      <p>Collect the blue orbs</p>
      <p>avoid the obstacles</p>
      <button id="start-btn">START</button>
      <p class="controls">Move mouse or touch to steer</p>
    </div>
  </div>
  <div id="gameover-screen" style="display: none;">
    <div class="content">
      <h2>Flight Complete</h2>
      <p>Distance: <span id="final-distance">0</span></p>
      <p>Best: <span id="final-highscore">0</span></p>
      <button id="restart-btn">TRY AGAIN</button>
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
  // Create sky with clouds
  sky = new Sky();
  scene.add(sky.mesh);
  
  // Create sea
  sea = new Sea();
  scene.add(sea.mesh);
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
  
  // Create airplane
  if (airplane) {
    scene.remove(airplane.mesh);
  }
  airplane = new Airplane();
  scene.add(airplane.mesh);
  
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
  if (obstacles.length < 12) {
    const obstacle = new Obstacle();
    scene.add(obstacle.mesh);
    obstacles.push(obstacle);
  }
}

function spawnEnergyOrb() {
  if (energyOrbs.length < 4) {
    const orb = new EnergyOrb();
    scene.add(orb.mesh);
    energyOrbs.push(orb);
  }
}

function checkCollisions() {
  if (!airplane) return;
  
  const planeBox = airplane.getBoundingBox();
  
  // Check obstacle collisions
  for (const obstacle of obstacles) {
    const obstacleBox = obstacle.getBoundingBox();
    if (planeBox.intersectsBox(obstacleBox)) {
      energy -= 30;
      particles.push(new ParticleBurst(obstacle.mesh.position.clone(), Colors.obstacle.rock));
      obstacle.destroy();
      obstacles = obstacles.filter(o => o !== obstacle);
      
      // Camera shake effect
      camera.position.x += (Math.random() - 0.5) * 0.5;
      camera.position.y += (Math.random() - 0.5) * 0.5;
      
      if (energy <= 0) {
        gameOver();
      }
    }
  }
  
  // Check energy orb collisions
  for (const orb of energyOrbs) {
    const orbBox = orb.getBoundingBox();
    if (planeBox.intersectsBox(orbBox)) {
      score += 100;
      energy = Math.min(100, energy + 15);
      particles.push(new ParticleBurst(orb.mesh.position.clone(), Colors.energy.orb, 20));
      orb.destroy();
      energyOrbs = energyOrbs.filter(e => e !== orb);
    }
  }
}

function updateUI() {
  const level = Math.floor(distance / 1000) + 1;
  document.getElementById('level')!.textContent = level.toString();
  document.getElementById('distance')!.textContent = Math.floor(distance).toString().padStart(3, '0');
  
  const energyFill = document.getElementById('energy-fill')!;
  energyFill.style.width = `${energy}%`;
  
  // Change energy bar color based on level
  if (energy > 50) {
    energyFill.style.background = Colors.energy.orb.toString(16);
  } else if (energy > 25) {
    energyFill.style.background = '#e8a87c';
  } else {
    energyFill.style.background = '#f25346';
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
  
  // Update sky
  sky?.update();
  
  // Update sea
  sea?.update();
  
  // Smooth camera reset after shake
  camera.position.x += (0 - camera.position.x) * 0.1;
  camera.position.y += (10 - camera.position.y) * 0.1;
  
  if (state === GameState.PLAYING) {
    // Update airplane
    const inputX = isTouching ? touchX : mouseX;
    const inputY = isTouching ? touchY : mouseY;
    airplane.update(inputX, inputY, time);
    
    // Increase game speed gradually
    gameSpeed = 1 + distance * 0.0001;
    gameSpeed = Math.min(gameSpeed, 2.5);
    
    // Update distance
    distance += gameSpeed * 0.5;
    
    // Spawn objects
    if (time - lastObstacleSpawn > 0.8 / gameSpeed) {
      spawnObstacle();
      lastObstacleSpawn = time;
    }
    
    if (time - lastOrbSpawn > 2.5) {
      spawnEnergyOrb();
      lastOrbSpawn = time;
    }
    
    // Update obstacles
    obstacles = obstacles.filter(obstacle => {
      if (obstacle.update()) {
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
