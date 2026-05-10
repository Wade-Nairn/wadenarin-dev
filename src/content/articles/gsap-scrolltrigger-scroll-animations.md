---
title: "GSAP ScrollTrigger: Scroll Animations Without Killing Performance"
description: "A practical guide to building scroll-driven animations with GSAP ScrollTrigger — covering pinning, scrubbing, staggered reveals, and the performance patterns that keep animations smooth."
slug: "/articles/gsap-scrolltrigger-scroll-animations"
publishOrder: 20
category: "Creative"
date: "2025-05-05"
---

# GSAP ScrollTrigger: Scroll Animations Without Killing Performance

GSAP's ScrollTrigger plugin is the standard tool for complex scroll-driven animations on the web. It's used on award-winning sites, major brand campaigns, and interactive editorial projects — but it's also one of those tools that's easy to use wrong, creating animations that are janky on mobile, break the scroll experience, or simply don't perform well under real conditions.

This guide covers how to use ScrollTrigger effectively: the core concepts, the patterns that come up most often in real projects, and the performance considerations that separate good scroll animation from bad.

---

## Setup

GSAP and ScrollTrigger are available via npm. Register the plugin before use:

```javascript
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
```

In React, register plugins at module level (outside components) to avoid registering them multiple times:

```javascript
// In a lib/gsap.js file imported once at the app root
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
```

---

## The Core Concept

ScrollTrigger connects a GSAP animation to the scroll position. The animation plays, pauses, reverses, or scrubs based on where the user is in the scroll journey.

The minimal ScrollTrigger configuration:

```javascript
gsap.to('.element', {
  opacity: 0,
  y: -50,
  scrollTrigger: {
    trigger: '.element',    // element that triggers the animation
    start: 'top 80%',       // when trigger's top hits 80% down the viewport
    end: 'bottom 20%',      // when trigger's bottom hits 20% down the viewport
    toggleActions: 'play none none reverse',
  },
});
```

`toggleActions` takes four values representing what happens at four scroll events:
- onEnter (scrolling down, trigger enters viewport)
- onLeave (scrolling down, trigger leaves viewport)
- onEnterBack (scrolling up, trigger re-enters viewport)
- onLeaveBack (scrolling up, trigger leaves viewport going up)

Common values: `play`, `pause`, `resume`, `reset`, `restart`, `complete`, `reverse`, `none`.

---

## Scrub: Tying Animation to Scroll Position

`scrub` binds animation progress directly to scroll position rather than playing it as a discrete event. The animation advances when scrolling down and reverses when scrolling up.

```javascript
gsap.to('.parallax-bg', {
  y: -200,
  ease: 'none', // linear is essential for scrub animations
  scrollTrigger: {
    trigger: '.section',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,   // ties to scroll position
  },
});
```

`scrub: true` ties directly to scroll position. `scrub: 1` adds a 1-second lag — the animation smoothly catches up to the scroll position, which feels more polished for most use cases.

`ease: 'none'` is important for scrubbed animations. Easing on a scrubbed animation creates unnatural acceleration/deceleration as the user scrolls at a constant speed.

---

## Pin: Sticking Elements During Scroll

`pin` fixes an element in place while the scroll continues, creating the "scroll past this section" effect used for feature showcases and product reveals:

```javascript
ScrollTrigger.create({
  trigger: '.feature-section',
  start: 'top top',
  end: '+=800', // pin for 800px of scroll
  pin: true,
  pinSpacing: true, // adds space below the pinned element (default true)
  anticipatePin: 1, // prevents flicker on fast scroll
});
```

While the element is pinned, you can run other animations synced to the scroll progress:

```javascript
const tl = gsap.timeline({
  scrollTrigger: {
    trigger: '.feature-section',
    start: 'top top',
    end: '+=800',
    pin: true,
    scrub: 1,
  },
});

tl.to('.feature-text', { opacity: 0, y: -50 })
  .to('.feature-image', { scale: 1.1 }, '<')
  .to('.next-feature-text', { opacity: 1, y: 0 });
```

The `'<'` in the timeline tells GSAP to start that tween at the same time as the previous one.

---

## Staggered Reveal Animations

The most common scroll animation pattern: elements fade in as they enter the viewport, staggered one after another.

```javascript
gsap.from('.card', {
  opacity: 0,
  y: 60,
  duration: 0.8,
  ease: 'power3.out',
  stagger: 0.15,
  scrollTrigger: {
    trigger: '.card-grid',
    start: 'top 75%',
  },
});
```

`stagger: 0.15` staggers each `.card` element by 150ms. This creates a cascading reveal effect across all matched elements.

For more control over stagger (different from-positions, grid-based stagger):

```javascript
gsap.from('.card', {
  opacity: 0,
  y: 40,
  stagger: {
    amount: 0.6,   // total time for all staggers combined
    from: 'start', // 'start', 'end', 'center', or 'random'
    ease: 'power2.out',
  },
  scrollTrigger: {
    trigger: '.card-grid',
    start: 'top 75%',
  },
});
```

---

## Using ScrollTrigger in React

In React, ScrollTrigger animations should be created inside `useLayoutEffect` and cleaned up when the component unmounts. GSAP provides a context-based cleanup helper:

```javascript
import { useLayoutEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';

function AnimatedSection() {
  const containerRef = useRef(null);
  
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.animate-item', {
        opacity: 0,
        y: 40,
        stagger: 0.1,
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
        },
      });
    }, containerRef); // scope the context to this component
    
    return () => ctx.revert(); // cleanup on unmount
  }, []);
  
  return (
    <div ref={containerRef}>
      <p className="animate-item">First item</p>
      <p className="animate-item">Second item</p>
    </div>
  );
}
```

`gsap.context()` scopes the animations and makes cleanup easy. `ctx.revert()` in the cleanup function removes all animations created in that context.

---

## Performance Considerations

### Animate GPU-composited properties only

The same rule as all CSS animation applies to GSAP: animate `transform` (via `x`, `y`, `scale`, `rotation` in GSAP) and `opacity`. Avoid animating `top`, `left`, `width`, `height`, `margin`, or `padding` — these force layout recalculation on every frame.

```javascript
// Good — GPU composited
gsap.to('.element', { y: -50, opacity: 0 });

// Bad — forces layout recalculation
gsap.to('.element', { top: -50, marginTop: 20 });
```

### Avoid scroll-jacking

Don't prevent default scroll behaviour or override native scroll momentum. Users expect to control their own scrolling. The pattern of "we control the scroll speed" is consistently cited as a negative experience. Use ScrollTrigger to respond to scroll, not to control it.

### Refresh on resize

ScrollTrigger calculates element positions on initialisation. After window resize (or DOM changes that shift layout), call `ScrollTrigger.refresh()`:

```javascript
window.addEventListener('resize', () => ScrollTrigger.refresh());
```

Or set it up automatically:

```javascript
ScrollTrigger.config({ autoRefreshEvents: 'resize,orientationchange' });
```

### Respect `prefers-reduced-motion`

```javascript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (!prefersReducedMotion) {
  gsap.from('.card', {
    opacity: 0,
    y: 60,
    stagger: 0.15,
    scrollTrigger: { trigger: '.grid', start: 'top 75%' },
  });
}
```

Skip or simplify animations for users who've indicated they prefer reduced motion. This is an accessibility requirement (WCAG 2.1 AA 2.3.3 at AAA, but widely expected at AA level for significant motion).

### Kill animations on unmount

Animations and ScrollTrigger instances that aren't killed when a component unmounts cause memory leaks. Use `gsap.context()` in React as shown above, or call `scrollTriggerInstance.kill()` explicitly.

---

## Common Patterns and Recipes

### Horizontal scroll section

```javascript
const panels = gsap.utils.toArray('.panel');

gsap.to(panels, {
  xPercent: -100 * (panels.length - 1),
  ease: 'none',
  scrollTrigger: {
    trigger: '.horizontal-section',
    pin: true,
    scrub: 1,
    end: () => '+=' + document.querySelector('.horizontal-section').offsetWidth,
  },
});
```

### Text character animation

```javascript
import SplitText from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

const split = new SplitText('.headline', { type: 'chars' });

gsap.from(split.chars, {
  opacity: 0,
  y: 20,
  stagger: 0.03,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.headline',
    start: 'top 80%',
  },
});
```

---

## Conclusion

ScrollTrigger is a powerful and mature tool. The gap between a good scroll animation implementation and a bad one usually comes down to performance discipline — animating the right properties, respecting user motion preferences, and cleaning up properly in component-based apps.

Master the scrub, pin, and stagger patterns covered here and you'll have the toolkit for the majority of scroll animation work you'll encounter in real projects.

---

## TL;DR

- **`scrollTrigger` config:** `trigger`, `start`, `end`, `toggleActions` are the four key properties to know
- **`scrub`:** ties animation to scroll position; use `scrub: 1` for smooth lag; always use `ease: 'none'`
- **`pin`:** fixes an element while scroll continues — the "stay on this section" pattern
- **Staggered reveals:** `gsap.from('.items', { stagger: 0.15, scrollTrigger: {...} })` — most common pattern
- **React:** use `gsap.context()` scoped to a ref + `ctx.revert()` in cleanup
- **Performance:** `transform`/`opacity` only; no scroll-jacking; `ScrollTrigger.refresh()` on resize; respect `prefers-reduced-motion`
