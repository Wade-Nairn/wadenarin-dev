---
title: "Framer Motion Performance Tips for Smooth UI Animation"
description: "Framer Motion makes animation easy but performance pitfalls are common. A practical guide to keeping animations smooth — covering layout animation, AnimatePresence, re-renders, and GPU-only properties."
slug: "/articles/framer-motion-performance-tips"
publishOrder: 22
category: "Technical"
date: "2025-05-05"
---

# Framer Motion Performance Tips for Smooth UI Animation

Framer Motion is the most popular animation library in the React ecosystem for good reason: its API is intuitive, the declarative model fits React well, and it handles complex animation scenarios — layout animations, shared element transitions, gesture-driven animation — with relatively little code.

But Framer Motion is also easy to use in ways that hurt performance. The declarative API hides the complexity of what's happening underneath, which means developers can ship janky animations without understanding why. This guide covers the common performance pitfalls and how to avoid them.

---

## Understand What Framer Motion Does Internally

Before optimising, it's worth understanding what Framer Motion is actually doing when you animate.

For most animations, Framer Motion sets CSS properties directly on the DOM element via inline styles. For `x`, `y`, `rotate`, `scale` and other transform properties, it uses CSS `transform` — which is GPU-composited and doesn't trigger layout recalculation.

For `layout` animations (where Framer Motion measures and animates the change in size/position between renders), it uses the FLIP technique: measure the element's position before and after the layout change, then animate the difference using transforms.

Understanding this tells you where the performance concerns lie:
- Animating non-transform properties = potential layout recalculation
- Animating layout changes with many elements = many DOM measurements
- Triggering unnecessary re-renders = unnecessary animation recalculations

---

## Only Animate GPU-Composited Properties

The most fundamental rule, same as with any web animation: only animate properties that the GPU can handle without triggering layout.

```jsx
// Good — GPU composited, smooth
<motion.div animate={{ x: 100, opacity: 0, scale: 0.9 }} />

// Bad — forces layout recalculation on every frame
<motion.div animate={{ top: 100, marginLeft: 20, width: 300 }} />
```

Framer Motion's `x`, `y`, `z`, `rotate`, `rotateX`, `rotateY`, `scale`, `scaleX`, `scaleY`, and `skew` all map to CSS transforms. Use these. Avoid animating `top`, `left`, `right`, `bottom`, `width`, `height`, `margin`, or `padding` for performance-critical animations.

If you need to animate layout-affecting properties (which is sometimes genuinely necessary), use Framer Motion's `layout` prop — it handles this more efficiently than directly animating those properties.

---

## Avoid Unnecessary Re-Renders

Framer Motion components re-evaluate their animation when their parent re-renders. If a parent component re-renders frequently (every keystroke, every scroll event), animated children will re-evaluate on every render — even if their animation values haven't changed.

```jsx
// Problematic — TypingInput re-renders on every keystroke
// AnimatedCard re-evaluates its animation on every keystroke
function Page() {
  const [query, setQuery] = useState('');
  
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <AnimatedCard /> {/* re-evaluates animation on every keystroke */}
    </>
  );
}
```

**Solution:** Separate frequently-updating state from components that contain animations. Move the input to its own component, or use `React.memo` on the animated component:

```jsx
const AnimatedCard = React.memo(function AnimatedCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      Card content
    </motion.div>
  );
});
```

---

## Use `useAnimation` for Triggered Sequences

When you need to trigger an animation from outside the component or in response to an async event, use `useAnimation` rather than updating state that causes a re-render:

```jsx
function Card() {
  const controls = useAnimation();
  
  const handleHover = async () => {
    await controls.start({ y: -8, scale: 1.02 });
  };
  
  const handleHoverEnd = async () => {
    await controls.start({ y: 0, scale: 1 });
  };
  
  return (
    <motion.div
      animate={controls}
      onHoverStart={handleHover}
      onHoverEnd={handleHoverEnd}
    />
  );
}
```

For hover animations specifically, Framer Motion's `whileHover` prop is even simpler and more performant — Framer Motion handles the hover state internally without React state:

```jsx
<motion.div whileHover={{ y: -8, scale: 1.02 }} />
```

---

## Layout Animations: Use Carefully

The `layout` prop enables automatic animation when an element's size or position changes due to a React state change. It's powerful but has a performance cost: Framer Motion must measure the DOM before and after every render that could affect the element's position.

```jsx
// Framer Motion measures this on every render — use only when needed
<motion.div layout>
  {items.map(item => <Item key={item.id} {...item} />)}
</motion.div>
```

Best practices for `layout` animations:
- Apply `layout` only to elements that actually need to animate their position/size changes
- Use `layout="position"` to animate only position changes (not size), or `layout="size"` for size only — more efficient than the default which animates both
- Wrap in `<LayoutGroup>` when coordinating layout animations across multiple components

For lists where items are added, removed, or reordered, combine `layout` with `AnimatePresence`:

```jsx
<AnimatePresence>
  {items.map(item => (
    <motion.li
      key={item.id}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  ))}
</AnimatePresence>
```

---

## AnimatePresence: Don't Overuse It

`AnimatePresence` enables exit animations for components that are removed from the React tree. It's useful, but it has overhead: it must keep exiting components mounted in the DOM until their exit animation completes.

```jsx
// Every conditional render now has exit animation overhead
<AnimatePresence>
  {isVisible && <Modal />}
</AnimatePresence>
```

**When it's worth the overhead:** exit animations that are visible and meaningful — modals fading out, notifications sliding away, list items removing.

**When it's not:** micro-interactions where the exit happens too fast to notice, or components where removal should be instant.

Also: setting `mode="wait"` on `AnimatePresence` causes it to wait for the exit animation to complete before mounting the new component. This looks polished for page transitions but means the user waits longer to see new content — use it deliberately.

---

## The `will-change` Hint

For components that will animate, adding `will-change: transform` as an initial style hints to the browser to promote the element to its own GPU layer ahead of time, preventing a visual "pop" when the animation starts:

```jsx
<motion.div
  style={{ willChange: 'transform' }}
  animate={{ x: 100 }}
/>
```

Caution: `will-change` has a cost — each promoted layer uses GPU memory. Apply it only to elements that actually animate, not globally. And remove it when the animation is complete if the element is long-lived.

---

## Variants: Organise Animations and Reduce Props

Variants let you define named animation states and propagate them through the component tree. This is both cleaner code and subtly better for performance, as it reduces the number of unique animation objects created on each render:

```jsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedList({ items }) {
  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map(item => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.label}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

The `staggerChildren` in the container variant automatically staggers child animations — no manual calculation needed.

---

## Debugging Performance Issues

When animations are janky, the Performance panel in Chrome DevTools is your primary diagnostic tool:

1. Open DevTools > Performance
2. Click Record
3. Trigger the animation
4. Stop recording
5. Look for red-topped tasks (long tasks on the main thread) and frames that took more than 16ms

Common findings:
- Long tasks during animation startup = expensive initial renders or DOM measurements
- Consistent frame drops = animating layout-affecting properties or excessive re-renders
- Jank at specific points = layout recalculations triggered by other code running during the animation

The "Layers" panel in DevTools shows which elements have been promoted to their own GPU layers. Too many layers = memory pressure; too few = potential compositing issues.

---

## Conclusion

Framer Motion's performance characteristics are predictable once you understand the model. Animate transform properties, avoid unnecessary re-renders, use `layout` deliberately, and keep `AnimatePresence` to meaningful exit transitions. Apply these principles and Framer Motion will produce smooth 60fps animations without the overhead that makes developers reach for lighter alternatives.

---

## TL;DR

- **Only animate GPU properties:** `x`, `y`, `scale`, `rotate`, `opacity` — never `top`, `left`, `width`, `height`, `margin`
- **Prevent re-render cascade:** `React.memo` on animated components, separate frequently-updating state from animated siblings
- **`whileHover` beats state updates** for hover animations — Framer Motion handles it internally
- **`layout` prop:** use only where needed; prefer `layout="position"` or `layout="size"` over the default
- **`AnimatePresence`:** for visible exit animations only; `mode="wait"` delays new content — use deliberately
- **Variants:** cleaner and slightly more efficient than inline animation objects; use staggerChildren for lists
- **Debug with:** Chrome DevTools Performance panel — look for long tasks and frame drops
