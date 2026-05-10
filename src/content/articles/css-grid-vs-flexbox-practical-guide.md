---
title: "CSS Grid vs Flexbox: A Practical Guide for Modern Layouts"
description: "Stop guessing which layout system to use. A practical guide to CSS Grid and Flexbox — when each shines, when to combine them, and the patterns that come up most in real projects."
slug: "/articles/css-grid-vs-flexbox-practical-guide"
publishOrder: 7
category: "Technical"
date: "2025-05-05"
---

# CSS Grid vs Flexbox: A Practical Guide for Modern Layouts

The CSS Grid vs Flexbox question is one of the most reliably asked questions in frontend development, and it often gets an unsatisfying answer: "use Grid for two-dimensional layouts and Flexbox for one-dimensional layouts." That's technically correct, but it doesn't help you make the decision in front of a real UI component.

This guide is more practical. We'll look at the mental model behind each, work through concrete UI patterns and which system suits them, cover the most common gotchas, and look at how the two systems work together — because most real layouts use both.

---

## The Mental Model

**Flexbox** thinks in one direction at a time. You declare a flex container, choose a main axis (row or column), and the children arrange themselves along that axis. Flexbox then gives you tools to control alignment, spacing, and wrapping — but the core idea is linear.

**Grid** thinks in two dimensions simultaneously. You define rows and columns, and then place items into that two-dimensional space. Items can span multiple rows, multiple columns, or both.

A useful way to think about this: Flexbox is content-driven (the content determines the layout), while Grid is layout-driven (you define the structure first and content fills it).

This distinction has real practical implications. When you're building a navigation bar where items should sit in a row with space between them, and the number of items might change — that's a content-driven layout. Flexbox is the right choice. When you're building a dashboard where you want a specific arrangement of panels at specific sizes — that's a layout-driven problem. Grid is the right choice.

---

## When to Use Flexbox

### Navigation bars and toolbars

```css
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
```

Flexbox is ideal for navbars because the items are inherently one-dimensional (they sit in a row), you want them to align vertically, and you often want the logo on one end and navigation links on the other — which `justify-content: space-between` handles perfectly.

### Button groups and form controls

Buttons and form controls that sit next to each other are classic Flexbox territory. The items have natural sizes, you want them to align vertically, and you want consistent gaps between them.

### Card internals

Inside a card, Flexbox is excellent. You typically want a column layout where the title, body text, and CTA button are stacked vertically, with the button pushed to the bottom regardless of content height:

```css
.card {
  display: flex;
  flex-direction: column;
}

.card__content {
  flex: 1; /* takes up remaining space, pushing the button down */
}
```

### Centring a single element

```css
.container {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

This is the simplest reliable centring technique in CSS. Works for both axes, requires no absolute positioning, and has excellent browser support.

### Wrapping lists of tags or chips

When you have a list of tags that should wrap to the next line when they run out of space:

```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

Flexbox's `flex-wrap` property makes this trivial. Grid can do this too, but Flexbox feels more natural here because the number of items per row is determined by the content, not a predefined column count.

---

## When to Use Grid

### Page-level layouts

Grid was designed for this. A typical page with a header, sidebar, main content area, and footer:

```css
.page {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}
```

Named template areas make this readable and easy to rearrange for different breakpoints. The structure is defined independently of the content.

### Card grids

When you have a grid of cards that should sit in equal-width columns, Grid is the right tool — especially with `auto-fill` or `auto-fit`:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

This creates as many columns as will fit, each at least 280px wide, with the last row filling available space. No media queries needed for the column count — it adapts automatically.

### Overlapping elements

Grid items can be placed in the same cell, enabling overlapping layouts without absolute positioning:

```css
.hero {
  display: grid;
  grid-template-columns: 1fr;
}

.hero__image,
.hero__content {
  grid-column: 1;
  grid-row: 1;
}
```

This technique is useful for image overlays, caption positioning, and creative layout effects where elements share the same space.

### Magazine and editorial layouts

Complex editorial layouts — where content blocks span varying numbers of columns and rows — are where Grid really earns its keep. Building these with Flexbox requires nested wrappers and fragile calculations; with Grid, you define the spans directly on each item.

---

## Common Patterns That Use Both

Real layouts almost always use Grid and Flexbox together. The typical pattern: Grid for the macro layout (page structure, content areas), Flexbox for the micro layout (what happens inside each component).

### A dashboard layout

```css
/* Grid handles the page structure */
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 64px 1fr;
}

/* Flexbox handles the navbar internals */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Flexbox handles the sidebar menu */
.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Grid handles the content area's panel arrangement */
.content-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
```

### A feature section

```css
/* Grid arranges the two columns */
.feature-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

/* Flexbox arranges the text content vertically */
.feature-text {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
```

---

## Common Gotchas

### Flexbox doesn't align rows with each other

In a flex container with `flex-wrap: wrap`, items in different rows don't align with each other. This is fine for tags or unstructured content, but if you want a card grid where cards in different rows align on their edges, use Grid — not Flexbox.

### `flex: 1` doesn't mean what you think in all contexts

`flex: 1` is shorthand for `flex-grow: 1; flex-shrink: 1; flex-basis: 0%`. The `flex-basis: 0%` part means items start from zero width and grow to fill space equally — which is usually what you want, but can surprise you when an item has a minimum content size.

### Grid gaps vs margins

Use `gap` (formerly `grid-gap`) for Grid and Flexbox spacing. Don't use margins between flex/grid items for spacing — `gap` is simpler, doesn't add space at the edges, and is now widely supported.

### `auto` rows vs explicit row heights

In a Grid layout, rows that aren't given an explicit height will size to their content by default. If you want rows to fill available space, use `grid-template-rows: 1fr` or set a `min-height` on the grid container.

---

## Subgrid: The Missing Piece

CSS Subgrid, now widely supported in modern browsers, solves the long-standing problem of aligning items across grid cells that live in different containers.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherits the parent grid's row tracks */
}
```

With Subgrid, cards in a grid can align their title, body, and footer rows across all cards in a row — even when content heights differ. This was previously only achievable with JavaScript.

---

## Conclusion

The "Grid for 2D, Flexbox for 1D" rule of thumb is a reasonable starting heuristic, but the more useful mental model is this: use Flexbox when the content should determine the layout, and Grid when you need to define the layout structure independently of the content. In practice, use both — they're complementary, not competing.

---

## TL;DR

- **Flexbox:** navbars, button groups, card internals, centring, wrapping tag lists — anywhere the content drives the layout
- **Grid:** page structure, card grids, editorial layouts, overlapping elements — anywhere you define the structure first
- **Use both:** Grid for macro layout, Flexbox for component internals — this is the normal pattern
- **Flexbox wrapping ≠ Grid rows:** flex-wrapped items don't align across rows; use Grid for aligned multi-row cards
- **Subgrid** solves cross-card alignment and is now widely supported
- Default to `gap` for spacing, never margins between flex/grid items
