---
title: "CSS-Only Animations: What's Possible Without JavaScript in 2025"
description: "CSS animation capabilities have expanded dramatically. Scroll-driven animations, view transitions, and advanced keyframes mean you can build more without JavaScript than ever before."
slug: "/articles/css-only-animations-2025"
publishOrder: 15
category: "Creative"
date: "2025-05-05"
---

# CSS-Only Animations: What's Possible Without JavaScript in 2025

The boundary between CSS and JavaScript animation keeps moving. Features that required a JavaScript library three years ago — scroll-triggered animations, page transitions, entrance animations based on visibility — can now be implemented in pure CSS with good browser support.

This is worth paying attention to for two reasons: CSS animations are more performant by default than JavaScript-driven alternatives (the browser can optimise them independently of the main thread), and removing JavaScript dependencies simplifies your codebase.

This guide covers what's genuinely possible in CSS animation in 2025, with practical examples and honest notes on browser support.

---

## The Foundations: Transitions and Keyframes

These have been around for years, but they're worth revisiting because their capabilities are often underestimated.

### Transitions

CSS transitions animate property changes triggered by state changes (hover, focus, class additions):

```css
.card {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 300ms ease, box-shadow 300ms ease;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}
```

The key performance principle: only animate `transform` and `opacity` in the hot path. These are GPU-composited properties that animate without triggering layout recalculation. Animating `top`, `left`, `margin`, `width`, or `height` forces the browser to recalculate layout on every frame — expensive and janky on lower-end devices.

### Keyframe Animations

```css
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hero-text {
  animation: fade-up 600ms ease forwards;
}
```

Keyframes allow multiple steps and complex easing. The `animation-fill-mode: forwards` keeps the element in its final state after the animation completes.

Staggered animations with CSS custom properties:

```css
.list-item {
  animation: fade-up 400ms ease forwards;
  animation-delay: calc(var(--index) * 80ms);
  opacity: 0;
}
```

Set `--index` on each element (via inline styles or a data attribute) and each item staggers naturally without JavaScript.

---

## Scroll-Driven Animations (New in 2024–2025)

Scroll-driven animations are the most significant addition to CSS animation in recent years. They let you tie animation progress directly to scroll position — without JavaScript, without `IntersectionObserver`, without GSAP.

### Animation Timeline: Scroll Progress

```css
@keyframes progress-bar {
  from { width: 0%; }
  to { width: 100%; }
}

.reading-progress {
  animation: progress-bar linear;
  animation-timeline: scroll(root);
}
```

This creates a reading progress bar that fills as the user scrolls down the page. `scroll(root)` ties the animation to the document scroll position. You can also scope it to a specific container.

### Animation Timeline: View Progress

The `view()` timeline ties animation to an element's position in the viewport:

```css
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-40px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.section {
  animation: slide-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}
```

`animation-range: entry 0% entry 40%` means the animation plays as the element enters the viewport, completing when 40% of the entry is done. No `IntersectionObserver` required.

**Browser support:** Scroll-driven animations are supported in Chrome and Edge. Firefox support is behind a flag as of 2025; Safari support is in development. For production use, progressive enhancement is appropriate — the animation enhances the experience but content remains accessible without it.

---

## View Transitions API

The View Transitions API allows smooth animated transitions between page states — and in the case of multi-page applications, between full page loads. This is the CSS approach to the page transitions that previously required complex JavaScript orchestration.

### Single-Page View Transitions

```javascript
// Trigger the transition
document.startViewTransition(() => {
  // Update the DOM here
  updateDOM();
});
```

```css
/* Customise the transition */
::view-transition-old(root) {
  animation: fade-out 200ms ease;
}

::view-transition-new(root) {
  animation: fade-in 200ms ease;
}
```

### Named View Transitions (Shared Element Transitions)

The most impressive use case: animating a shared element between two states, such as a card expanding into a detail view:

```css
.card {
  view-transition-name: product-card;
}

.detail-page {
  view-transition-name: product-card;
}
```

When the transition triggers, the browser automatically animates the element from its position in the first state to its position in the second. This creates the "shared element transition" pattern from native mobile apps, entirely in CSS and a few lines of JavaScript.

**Browser support:** View Transitions are supported in Chrome and Edge. Safari has basic support. Firefox support is in progress.

---

## The `:has()` Selector for State-Based Animations

The `:has()` pseudo-class — now well supported — enables CSS animations triggered by child element state, which was previously only possible with JavaScript.

```css
/* Animate the parent when a child checkbox is checked */
.card:has(input:checked) {
  border-color: var(--color-primary);
  transform: scale(1.02);
  transition: border-color 200ms, transform 200ms;
}

/* Animate a sibling when a different element is hovered */
.menu:has(.menu-item:hover) .menu-item:not(:hover) {
  opacity: 0.5;
  transition: opacity 150ms;
}
```

This last pattern — dimming non-hovered items when any item is hovered — was a classic "needs JavaScript" requirement. With `:has()`, it's two lines of CSS.

---

## `@starting-style` for Entry Animations

`@starting-style` defines the initial style of an element before its first render, enabling entry animations for elements that are conditionally rendered:

```css
.dialog {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms, display 300ms allow-discrete;
}

@starting-style {
  .dialog {
    opacity: 0;
    transform: translateY(10px);
  }
}
```

This animates the element in when it's first inserted into the DOM. Previously, you needed JavaScript to add a class after a tick to trigger the CSS transition. `@starting-style` removes that hack.

**Browser support:** Chrome and Edge. Other browsers in progress.

---

## When to Still Reach for JavaScript

CSS animation in 2025 covers a lot of ground, but JavaScript (and libraries like GSAP or Framer Motion) is still the right tool for:

- **Complex sequencing** — multi-step timelines where different elements animate in coordinated sequences with precise timing control
- **Physics-based animations** — spring physics, momentum, inertia
- **Gesture-driven animations** — dragging, swiping, pinching that tie animation to pointer movement
- **Scroll animations with complex logic** — parallax effects with custom easing curves, scroll-jacking (use sparingly)
- **WebGL and canvas** — CSS doesn't touch these

The practical decision: start with CSS. If you hit a constraint that CSS genuinely can't handle, then add JavaScript. Don't add a JavaScript animation library by default — the overhead (bundle size, complexity) is real.

---

## Performance Considerations for CSS Animations

Even CSS animations can cause performance issues if you're not careful:

- **Stick to `transform` and `opacity`** for animated properties
- **Use `will-change: transform`** on elements that will animate — this tells the browser to promote them to their own compositing layer
- **Respect `prefers-reduced-motion`:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is important for accessibility. Some users experience nausea or disorientation from motion. `prefers-reduced-motion` lets you respect their preference.

---

## Conclusion

CSS animation in 2025 is significantly more capable than it was even two years ago. Scroll-driven animations, view transitions, `@starting-style`, and `:has()` collectively enable patterns that previously required JavaScript libraries — with better performance and less complexity.

For new projects, default to CSS for animation and only add JavaScript when you hit a genuine ceiling. The progressive enhancement model works well: CSS animations as the baseline, enhanced with JavaScript where needed.

---

## TL;DR

- **Transitions and keyframes:** solid for hover states, entrance animations, staggered lists — use `transform` and `opacity` only
- **Scroll-driven animations:** tie animation progress to scroll position or viewport entry — Chrome/Edge now, Firefox/Safari soon
- **View Transitions API:** smooth page transitions and shared element animations — Chrome/Edge, progressive enhancement recommended
- **`:has()` selector:** animate parents and siblings based on child state — replaces common JavaScript requirements
- **`@starting-style`:** entry animations for conditionally rendered elements without JavaScript hacks
- **Still use JS for:** complex sequencing, physics, gesture-driven animations, WebGL
- **Always implement `prefers-reduced-motion`** for accessibility
