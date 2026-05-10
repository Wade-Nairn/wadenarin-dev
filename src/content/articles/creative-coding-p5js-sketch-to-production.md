---
title: "Creative Coding with p5.js: From Sketch to Production"
description: "A guide to creative coding with p5.js — covering setup, core drawing primitives, interaction, animation, and how to move a p5.js sketch from experiment to a polished, deployed piece."
slug: "/articles/creative-coding-p5js-sketch-to-production"
publishOrder: 29
category: "Creative"
date: "2025-05-05"
---

# Creative Coding with p5.js: From Sketch to Production

p5.js is a JavaScript library that makes creative coding accessible. It's the modern successor to Processing — the Java-based creative coding environment that introduced a generation of artists, designers, and developers to algorithmic visual work. p5.js brings the same approachability to the browser, with access to the full JavaScript ecosystem.

This guide takes you from your first p5.js sketch through to deploying a polished piece — covering the setup, the core drawing API, interaction patterns, animation, and the practical steps to make something shareable and production-quality.

---

## What p5.js Is For

p5.js is excellent for:
- **Generative art:** algorithmic output that produces unique visual work
- **Interactive installations:** pieces that respond to user input, audio, or external data
- **Data visualisation:** custom, expressive visualisations beyond what charting libraries offer
- **Prototyping:** fast visual experimentation where the goal is to see something quickly
- **Learning:** the immediate visual feedback makes it ideal for exploring programming concepts

It's less suited to production web application UI or performance-critical graphics where WebGL or the raw Canvas API would be more appropriate.

---

## Setup Options

### Option 1: p5.js Web Editor (Quickest Start)

editor.p5js.org is the fastest way to start. No installation, runs in the browser, immediately shareable. Ideal for sketching and experimentation.

### Option 2: CDN in HTML File

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
</head>
<body>
  <script>
    function setup() {
      createCanvas(800, 800);
    }
    
    function draw() {
      background(20);
      // Your drawing code here
    }
  </script>
</body>
</html>
```

### Option 3: npm with Vite (Recommended for Production)

```bash
npm create vite@latest my-sketch -- --template vanilla
cd my-sketch
npm install p5
```

```javascript
// src/main.js
import p5 from 'p5';

const sketch = (p) => {
  p.setup = () => {
    p.createCanvas(800, 800);
  };
  
  p.draw = () => {
    p.background(20);
    // drawing code
  };
};

new p5(sketch);
```

The instance mode (`(p) => {...}`) is the pattern for module-based usage — it avoids polluting the global scope with p5's function names.

---

## Core API: Drawing Primitives

p5.js has an approachable drawing API. The key functions:

### Shapes

```javascript
// Rectangle
rect(x, y, width, height, [cornerRadius]);

// Ellipse / Circle
ellipse(x, y, width, height); // ellipse
circle(x, y, diameter);       // shorthand for ellipse with equal dimensions

// Line
line(x1, y1, x2, y2);

// Triangle
triangle(x1, y1, x2, y2, x3, y3);

// Custom shape with vertices
beginShape();
vertex(100, 100);
vertex(200, 50);
vertex(300, 100);
vertex(250, 200);
vertex(150, 200);
endShape(CLOSE); // CLOSE connects the last vertex to the first
```

### Colour

```javascript
// Fill (interior colour)
fill(255, 100, 50);        // RGB
fill(255, 100, 50, 128);   // RGBA (128 = 50% opacity)
fill('#6366f1');            // hex string
noFill();                  // transparent fill

// Stroke (outline colour)
stroke(255);               // white
stroke(255, 0, 0, 100);    // semi-transparent red
noStroke();                // no outline
strokeWeight(2);           // line thickness

// HSB colour mode (hue, saturation, brightness)
colorMode(HSB, 360, 100, 100, 100);
fill(200, 70, 90);         // hue: 200 (blue), saturation: 70%, brightness: 90%
```

### Text

```javascript
textSize(24);
textAlign(CENTER, CENTER);
fill(255);
text('Hello', width / 2, height / 2);

// Custom fonts
let font;
function preload() {
  font = loadFont('assets/font.ttf');
}
function draw() {
  textFont(font);
}
```

---

## Setup and Draw Loop

The two core p5.js functions:

```javascript
function setup() {
  // Runs once when the sketch starts
  createCanvas(windowWidth, windowHeight);
  background(20);
  colorMode(HSB, 360, 100, 100);
  
  // Settings that don't change
  frameRate(60);
  angleMode(RADIANS); // or DEGREES
}

function draw() {
  // Runs continuously (60fps by default)
  
  // Clear the background each frame, or use semi-transparent to create trails
  background(20, 20, 20, 20); // semi-transparent dark overlay
  
  // Draw each frame here
}
```

---

## Interaction

p5.js provides built-in variables and functions for input:

```javascript
// Mouse position
mouseX, mouseY          // current mouse position
pmouseX, pmouseY        // previous mouse position (for calculating velocity)

// Mouse events
function mousePressed() {
  // runs when mouse button is pressed
  console.log(`Clicked at ${mouseX}, ${mouseY}`);
}

function mouseDragged() {
  // runs while mouse is held and moving
  line(pmouseX, pmouseY, mouseX, mouseY); // draw continuous line
}

// Keyboard
keyCode, key             // current pressed key
function keyPressed() {
  if (key === 's') saveCanvas('my-sketch', 'png'); // save screenshot
  if (keyCode === SPACE) togglePause();
}
```

### Mapping Values

`map()` is one of p5's most useful functions — it remaps a value from one range to another:

```javascript
// Map mouse X position (0 to width) to a hue (0 to 360)
const hue = map(mouseX, 0, width, 0, 360);
fill(hue, 70, 90);

// Map mouse Y position to circle size
const size = map(mouseY, 0, height, 10, 200);
circle(width / 2, height / 2, size);
```

---

## Animation: Working with Time

p5.js provides `frameCount` (total frames since start) and `millis()` (milliseconds since start) for time-based animation:

```javascript
function draw() {
  background(20);
  
  const t = frameCount * 0.02; // slow time variable
  
  // Sinusoidal motion
  const x = width / 2 + cos(t) * 200;
  const y = height / 2 + sin(t * 1.3) * 150; // different frequency for Lissajous pattern
  
  circle(x, y, 20);
}
```

### The `noise()` Function

p5.js has built-in Perlin noise — smooth, natural-looking randomness:

```javascript
function draw() {
  background(20, 10);
  
  const t = frameCount * 0.005;
  
  for (let i = 0; i < 100; i++) {
    const x = noise(i * 0.1, t) * width;
    const y = noise(i * 0.1 + 100, t) * height;
    
    fill(noise(i * 0.05) * 360, 70, 90, 80);
    noStroke();
    circle(x, y, 8);
  }
}
```

`noise()` takes 1, 2, or 3D coordinates and returns a value between 0 and 1. The slow time dimension (`t`) makes the pattern evolve smoothly.

---

## Saving and Exporting

```javascript
// Save a PNG screenshot
saveCanvas('my-sketch', 'png');

// Save on keypress
function keyPressed() {
  if (key === 's') saveCanvas(`sketch-${Date.now()}`, 'png');
}

// Save as SVG (requires p5.svg library)
// createCanvas(800, 800, SVG);
```

For high-resolution exports, temporarily multiply the canvas size:

```javascript
const EXPORT_SCALE = 4;

function setup() {
  const isExporting = false; // toggle for export
  const w = isExporting ? 800 * EXPORT_SCALE : 800;
  createCanvas(w, w);
  if (isExporting) scale(EXPORT_SCALE);
}
```

---

## Moving to Production: Using p5.js in React

For embedding a p5.js sketch in a React application:

```jsx
import { useEffect, useRef } from 'react';
import p5 from 'p5';

function P5Sketch({ sketchFunction }) {
  const canvasRef = useRef(null);
  const sketchRef = useRef(null);
  
  useEffect(() => {
    sketchRef.current = new p5(sketchFunction, canvasRef.current);
    
    return () => {
      sketchRef.current.remove(); // important cleanup
    };
  }, [sketchFunction]);
  
  return <div ref={canvasRef} />;
}

// Usage
const mySketch = (p) => {
  p.setup = () => p.createCanvas(800, 600);
  p.draw = () => {
    p.background(20);
    p.circle(p.mouseX, p.mouseY, 50);
  };
};

<P5Sketch sketchFunction={mySketch} />
```

The `p5ref.current.remove()` cleanup is critical — it prevents memory leaks when the component unmounts.

---

## Deploying

A p5.js sketch is a static HTML page — it can be deployed anywhere that hosts static files:

- **Vercel/Netlify:** push to GitHub, connect to Vercel/Netlify, deploy automatically
- **GitHub Pages:** free, works directly from a repository
- **p5.js Web Editor:** the "Share" button gives you a public URL immediately

For a Vite-based sketch:

```bash
npm run build       # outputs to dist/
# Deploy dist/ to your hosting of choice
```

---

## Conclusion

p5.js is the fastest path from creative coding idea to visible result. Its approachable API, built-in animation loop, and rich library of examples make it ideal for visual experimentation. The sketch-to-production path — starting in the web editor, graduating to a local Vite setup, and deploying as a static site — scales from hobby project to portfolio piece.

If you're a frontend developer with any interest in generative art or creative coding, p5.js is the most accessible entry point. Start with something simple — a bouncing circle, a noise-driven flow field — and iterate from there.

---

## TL;DR

- **Setup options:** p5.js web editor (instant), CDN in HTML (simple), Vite + npm (production-ready)
- **Core loop:** `setup()` runs once, `draw()` runs every frame — put animation in `draw()`
- **Key utilities:** `map()` for remapping ranges, `noise()` for smooth randomness, `frameCount` for time
- **Colour:** switch to `colorMode(HSB)` for more intuitive colour control
- **Interaction:** `mouseX/Y`, `mousePressed()`, `keyPressed()` — all built in
- **React integration:** `new p5(sketch, containerRef)` in `useEffect`, `p5instance.remove()` on cleanup
- **Deploy:** build with Vite, deploy the `dist/` folder to Vercel/Netlify/GitHub Pages
