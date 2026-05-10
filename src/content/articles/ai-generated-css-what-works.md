---
title: "AI-Generated CSS: What Works, What Doesn't, and What to Never Ship"
description: "An honest look at using AI to write CSS — testing across layout, animation, responsive design, and browser compatibility. What's safe to use, what needs review, and what to rewrite."
slug: "/articles/ai-generated-css-what-works"
publishOrder: 13
category: "AI Coding"
date: "2025-05-05"
---

# AI-Generated CSS: What Works, What Doesn't, and What to Never Ship

CSS is one of the areas where AI assistance feels most immediately useful. Describe a layout, get CSS. Ask for a component style, get CSS. It's fast, it's often accurate, and it removes the friction of remembering exactly which flex properties to combine for a particular alignment.

But "often accurate" isn't the same as "always accurate," and CSS has enough subtle traps — specificity conflicts, stacking context surprises, browser quirks, performance implications — that shipping AI-generated styles without understanding them can create problems that are hard to diagnose later.

This article is a practical assessment of AI-generated CSS across different use cases, based on using Claude, GitHub Copilot, and Cursor's AI features extensively in real projects.

---

## What AI Does Well with CSS

### Flexbox and Grid layouts

This is the strongest area. AI assistants have clearly absorbed a large amount of CSS layout content, and they generate Flexbox and Grid code that's accurate for the majority of common patterns.

Ask for "a three-column card grid that switches to a single column on mobile" and you'll get something like:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .card-grid {
    grid-template-columns: 1fr;
  }
}
```

This is correct, clean, and unremarkable. The same quality applies to most standard layout patterns — navbars, hero sections, sidebar layouts. For these, AI output is a genuine time-saver with minimal review required.

### Responsive breakpoint patterns

AI handles responsive design well when given clear direction. Prompt it with the layout you want at each breakpoint and it generates media queries that are structurally correct.

Where it sometimes goes wrong: using fixed pixel breakpoints rather than content-relative breakpoints, or generating breakpoints that don't match your project's existing breakpoint system. Always check that generated breakpoints align with your design system's token values.

### Utility-style class generation

If you're working with a custom utility class system (or extending Tailwind), AI is strong at generating utility variants. "Add responsive padding utilities for the five spacing values in our system" produces correct, systematic output that would be tedious to write by hand.

### CSS custom property systems

Describing a colour system and asking AI to generate CSS custom properties as an output is effective:

```css
:root {
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  /* ... */
}
```

AI generates these systematically and rarely makes errors in the token structure. The values themselves need design input — AI doesn't know your brand colours — but the structure is reliable.

### Simple animations

For CSS transitions and basic keyframe animations, AI output is generally correct:

```css
.button {
  transition: background-color 200ms ease, transform 200ms ease;
}

.button:hover {
  transform: translateY(-2px);
}
```

This is correct and performant (using GPU-composited properties). AI has absorbed enough animation guidance to usually reach for `transform` and `opacity` rather than `top`, `left`, or `width`.

---

## Where AI Gets CSS Wrong

### Stacking context and z-index

Z-index problems are among the most common CSS issues in production codebases, and AI is not reliably good at reasoning about them. It will generate z-index values without accounting for the stacking context created by parent elements — which means a z-index of 9999 on a modal might still be covered by a sibling element if that sibling creates its own stacking context.

If AI generates z-index values, manually trace the stacking context before shipping. This is one area where you need to understand what's happening, not just that the output looks correct.

### Specificity in component systems

In component-based CSS, specificity conflicts are easy to create and hard to debug. AI-generated CSS sometimes reaches for specificity — using `.parent .child` selectors where a lower-specificity approach would be cleaner. In isolation this looks fine; in a codebase where multiple components interact, it can cause unexpected overrides.

Review generated CSS for unnecessary specificity and flatten selectors where possible.

### Browser compatibility of newer features

AI's training data has a cutoff date, and CSS evolves quickly. Features like `@layer`, `container queries`, `:has()`, `subgrid`, and `anchor positioning` are either not in the training data or are represented with early-adoption caveats that may no longer apply.

Before using any CSS feature generated by AI, check its current browser support on caniuse.com. Don't assume AI's qualification of support is current.

### Accessibility-affecting styles

Some CSS choices directly affect accessibility:

- `outline: none` or `outline: 0` on focusable elements removes the keyboard focus indicator
- `user-select: none` on text can cause issues for screen reader users
- `pointer-events: none` used incorrectly can trap keyboard users
- `overflow: hidden` on containers can clip content when text is enlarged

AI doesn't always flag these implications. Review any generated styles that touch focus, overflow, user interaction, or content visibility with accessibility in mind.

### Performance-unsafe animations

When AI generates animations for properties that aren't GPU-composited (`margin`, `padding`, `top`, `left`, `height`, `width`, `background`), it causes layout reflow on every frame — which is expensive and produces janky animations on lower-end devices.

```css
/* AI might generate this — causes layout reflow */
@keyframes slide-in {
  from { margin-left: -100%; }
  to { margin-left: 0; }
}

/* This is better — GPU composited */
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

Always check animations: only `transform` and `opacity` are GPU-composited and safe for 60fps animations. `filter` is mostly safe. Everything else causes reflow.

---

## What to Never Ship Unreviewed

### Any CSS that uses !important

AI sometimes reaches for `!important` to resolve specificity conflicts. This is almost always the wrong solution and creates maintenance debt. If AI generates `!important`, treat it as a signal to understand the specificity conflict and resolve it properly.

### Vendor-prefixed properties added "just in case"

```css
/* AI might generate this */
-webkit-transform: translateX(-50%);
-moz-transform: translateX(-50%);
transform: translateX(-50%);
```

Browser support for most properties requiring vendor prefixes is now universal in modern browsers. Unnecessary prefixes add noise and suggest the AI is drawing on older training data. Check caniuse.com for the specific property — in most cases, the unprefixed version is all you need.

### Generated CSS variable names that conflict with your system

If your project has an existing design token system, AI-generated variable names may conflict or duplicate existing tokens. Always check generated custom property names against your project's existing variables.

### CSS that hasn't been tested at multiple viewport sizes

AI generates responsive CSS based on pattern matching, not on understanding your specific layout constraints. Always test at mobile, tablet, and desktop before shipping.

---

## A Practical Workflow for AI CSS

The workflow I've settled on:

1. **Prompt for structure, not details.** Ask AI for the layout structure and let it generate the framework. Fill in specific values (colours, spacing, typography) yourself using your design system.

2. **Review every generated property.** This takes two minutes for a typical component. Check for `!important`, z-index, performance-unsafe animations, and accessibility implications.

3. **Test across browsers and viewpoints.** Don't assume AI-generated responsive CSS works until you've checked it.

4. **Cross-reference newer features.** Any CSS feature that feels unfamiliar — check caniuse.com before assuming AI's description of support is current.

---

## Conclusion

AI-generated CSS is most reliable for the things it's seen most: standard Flexbox and Grid layouts, responsive patterns, utility classes, and simple transitions. It's least reliable for stacking context, accessibility-affecting styles, performance-unsafe animations, and cutting-edge features.

The practical rule: AI CSS is a solid first draft. Read it, understand it, test it. Don't ship what you don't understand.

---

## TL;DR

- **AI is strong at:** Flexbox/Grid layouts, responsive patterns, CSS custom property systems, simple transitions
- **AI gets wrong:** stacking context / z-index, specificity in component systems, newest browser features, performance-unsafe animations
- **Never ship without review:** `!important`, unnecessary vendor prefixes, z-index values, any animation using margin/padding/top/left
- **Always check:** caniuse.com for newer features; accessibility implications of focus, overflow, and visibility styles
- **Best workflow:** AI for structure and pattern, you for design system values and final review
