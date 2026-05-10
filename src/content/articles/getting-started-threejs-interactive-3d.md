---
title: "Getting Started with Three.js: Building Interactive 3D Web Experiences"
description: "A practical introduction to Three.js for frontend developers — setting up a scene, working with geometries and materials, adding lights and animation, and building something interactive."
slug: "/articles/getting-started-threejs-interactive-3d"
publishOrder: 16
category: "Creative"
date: "2025-05-05"
---

# Getting Started with Three.js: Building Interactive 3D Web Experiences

Three.js is the most widely used library for 3D graphics on the web. It wraps WebGL — a low-level graphics API — in an approachable, well-documented interface that frontend developers can learn without a background in 3D or graphics programming.

The gap between knowing frontend development and building your first Three.js scene is smaller than it looks. If you understand JavaScript and have a passing familiarity with the HTML canvas element, you have what you need to start.

This guide takes you from installation to an interactive 3D scene with custom geometry, lighting, and mouse interaction. The code is practical — this is a starting point for real projects, not a simplified toy example.

---

## What You'll Build

By the end of this guide, you'll have a scene with:
- A 3D object with a custom material
- Point lighting with shadows
- An animation loop
- Mouse-driven rotation interaction

---

## Setup

Install Three.js via npm:

```bash
npm install three
```

For TypeScript type definitions:

```bash
npm install --save-dev @types/three
```

Basic project structure (framework-agnostic, works with Vite, Next.js, or vanilla):

```javascript
import * as THREE from 'three';
```

---

## The Three.js Mental Model

Every Three.js scene has three required pieces:

**Scene** — a container that holds all the objects, lights, and cameras in your 3D world.

**Camera** — defines the viewpoint. The `PerspectiveCamera` mimics human vision with a field of view angle and perspective distortion. The `OrthographicCamera` renders without perspective distortion, useful for technical or isometric views.

**Renderer** — takes the scene and camera and draws them to a `<canvas>` element. The `WebGLRenderer` is the standard choice.

```javascript
// Scene
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(
  75,                                           // field of view (degrees)
  window.innerWidth / window.innerHeight,        // aspect ratio
  0.1,                                          // near clipping plane
  1000                                          // far clipping plane
);
camera.position.z = 5;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2x for performance
document.body.appendChild(renderer.domElement);
```

---

## Adding a Mesh

A mesh is the combination of a geometry (the shape) and a material (the surface appearance).

```javascript
// Geometry — the shape
const geometry = new THREE.IcosahedronGeometry(1, 1); // radius, detail level

// Material — the surface
const material = new THREE.MeshStandardMaterial({
  color: 0x6366f1,      // hex colour
  roughness: 0.3,
  metalness: 0.8,
  wireframe: false,
});

// Mesh = geometry + material
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

`MeshStandardMaterial` is the physically-based material — it responds to light realistically. For a material that ignores lighting and always shows its colour at full brightness, use `MeshBasicMaterial`.

---

## Lighting

`MeshStandardMaterial` requires light to be visible. Without lights, the mesh renders as black.

```javascript
// Ambient light — fills the scene with flat, directionless light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Point light — emits light in all directions from a single point
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// Directional light — parallel rays, like sunlight
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 2, 3);
scene.add(directionalLight);
```

---

## The Animation Loop

Three.js scenes are rendered in an animation loop — a function that runs on every frame using `requestAnimationFrame`:

```javascript
function animate() {
  requestAnimationFrame(animate);
  
  // Update your scene here
  mesh.rotation.x += 0.005;
  mesh.rotation.y += 0.01;
  
  renderer.render(scene, camera);
}

animate();
```

This runs at the display's refresh rate (typically 60fps or 120fps). The `requestAnimationFrame` call at the top schedules the next frame.

---

## Handling Resize

The renderer and camera need to update when the window resizes:

```javascript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
```

---

## Mouse Interaction

The most common interaction pattern: rotating the mesh as the mouse moves across the canvas.

```javascript
const mouse = { x: 0, y: 0 };
const target = { x: 0, y: 0 };

window.addEventListener('mousemove', (e) => {
  // Normalise to -1 to 1 range
  mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
  mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});

function animate() {
  requestAnimationFrame(animate);
  
  // Lerp toward the target for smooth follow
  target.x += (mouse.x - target.x) * 0.05;
  target.y += (mouse.y - target.y) * 0.05;
  
  mesh.rotation.y = target.x * Math.PI;
  mesh.rotation.x = target.y * Math.PI * 0.5;
  
  renderer.render(scene, camera);
}
```

The `lerp` (linear interpolation) — `target.x += (mouse.x - target.x) * 0.05` — creates the smooth lag between mouse position and object rotation. The `0.05` factor controls the smoothing: higher values follow the mouse more closely, lower values create more lag.

---

## Shaders: The Next Level

Once you're comfortable with Three.js basics, custom shaders (written in GLSL) unlock effects that aren't possible with built-in materials.

```javascript
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x6366f1) },
  },
  vertexShader: `
    uniform float uTime;
    
    void main() {
      vec3 pos = position;
      pos.y += sin(pos.x * 3.0 + uTime) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    
    void main() {
      gl_FragColor = vec4(uColor, 1.0);
    }
  `,
});

// In the animation loop:
shaderMaterial.uniforms.uTime.value = clock.getElapsedTime();
```

This vertex shader creates a wave effect by displacing vertices along the Y axis using a sine function driven by time. GLSL has a learning curve, but the results — animated noise, procedural textures, post-processing effects — are uniquely powerful.

---

## Performance Tips

**Dispose of resources** when removing objects from the scene. Geometries and materials hold GPU memory that needs to be explicitly released:

```javascript
geometry.dispose();
material.dispose();
```

**Limit draw calls.** Each mesh is a draw call. Combine static meshes into a single geometry where possible using `BufferGeometryUtils.mergeGeometries()`.

**Use `InstancedMesh`** when you need many copies of the same geometry (particles, crowds, repeated objects). `InstancedMesh` renders thousands of instances in a single draw call:

```javascript
const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);
```

**Reduce geometry complexity** on mobile. Use `renderer.getPixelRatio()` to detect mobile devices and reduce the `detail` parameter on complex geometries.

**Limit shadow computation.** Shadows are expensive. Use them sparingly, and consider baking shadows into textures for static scenes.

---

## Ecosystem Tools Worth Knowing

**react-three-fiber** — React bindings for Three.js. If you're in a React project, this lets you write Three.js as JSX with React's component model. Works extremely well in practice.

**Drei** — a helper library for react-three-fiber that provides pre-built components (orbit controls, environments, loaders, text) that would otherwise require significant boilerplate.

**GSAP with Three.js** — for animating Three.js properties (positions, material values, camera movements) with timeline control and easing.

---

## Conclusion

Three.js makes 3D on the web genuinely accessible for frontend developers. The core concepts — scene, camera, renderer, mesh, material, light, animation loop — are learnable in an afternoon. Building something that looks impressive takes a bit longer, but the ceiling is high.

The creative development skills that Three.js enables are rare in the Australian frontend market. Developers who can build interactive 3D experiences command a significant rate premium and work on more interesting projects. If you have any interest in the creative development space, this is the most impactful skill to develop.

---

## TL;DR

- **Three required pieces:** Scene (container), Camera (viewpoint), Renderer (draws to canvas)
- **Mesh = geometry + material** — `IcosahedronGeometry`, `BoxGeometry`, `SphereGeometry` are good starting shapes; `MeshStandardMaterial` responds to light
- **Add lights:** `AmbientLight` for base fill, `PointLight` or `DirectionalLight` for directional shading
- **Animation loop:** `requestAnimationFrame` runs at refresh rate — update and render each frame
- **Mouse interaction:** normalise mouse position to –1/+1 range, lerp toward target for smooth follow
- **Performance:** dispose resources, use `InstancedMesh` for repeated geometry, limit shadow use
- **Ecosystem:** react-three-fiber + Drei for React projects; GSAP for complex animation sequencing
