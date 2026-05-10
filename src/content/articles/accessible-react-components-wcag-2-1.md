---
title: "Building Accessible React Components for WCAG 2.1 AA"
description: "A practical guide to WCAG 2.1 AA compliance in React — covering semantic HTML, ARIA, keyboard navigation, focus management, and testing approaches that actually catch issues."
slug: "/articles/accessible-react-components-wcag-2-1"
publishOrder: 11
category: "Technical"
date: "2025-05-05"
---

# Building Accessible React Components for WCAG 2.1 AA

Accessibility in React is one of those topics where the gap between knowing the theory and writing compliant components in practice is significant. Most developers know they should use semantic HTML and add ARIA attributes. Far fewer have built a custom modal that passes an actual accessibility audit, or implemented a combobox that works correctly with both keyboard and screen reader.

This guide is practical. We'll work through the patterns and code that come up most often in real React projects, covering what WCAG 2.1 AA actually requires, where React makes accessibility harder than it should be, and how to test your work.

---

## Why WCAG 2.1 AA

WCAG 2.1 AA is the accessibility standard required by Australian law for government websites and increasingly expected by financial services, healthcare, and enterprise clients. It's also the standard tested by automated tools like axe-core and Lighthouse.

AA conformance covers four principles: Perceivable, Operable, Understandable, and Robust — the POUR acronym. In practice for a React developer, the most commonly failed criteria fall into a small number of categories: missing focus management, incorrect ARIA usage, insufficient colour contrast, and inaccessible custom interactive components.

---

## Start with Semantic HTML

The single most impactful accessibility decision is also the simplest: use the correct HTML element for the job.

```jsx
// Don't do this
<div onClick={handleClick} className="button">Submit</div>

// Do this
<button onClick={handleClick}>Submit</button>
```

The native `<button>` element gets keyboard focus, responds to Enter and Space, announces itself correctly to screen readers, and communicates its disabled state via the `disabled` attribute — for free, with no extra code. A `<div>` with an `onClick` handler does none of these things without significant additional work.

The same principle applies throughout:
- Use `<nav>` for navigation regions
- Use `<main>` for main content
- Use `<article>` for standalone content pieces
- Use `<h1>`–`<h6>` in logical heading hierarchy, not for visual styling
- Use `<label>` elements associated with form inputs
- Use `<table>` for tabular data, with `<th>` and `scope` attributes

---

## Form Accessibility

Forms are where accessibility failures cluster. Every form input needs a label, and that label needs to be programmatically associated with its input.

```jsx
// Incorrect — visible label but not associated
<label>Email address</label>
<input type="email" name="email" />

// Correct — associated via htmlFor / id
<label htmlFor="email">Email address</label>
<input type="email" id="email" name="email" />

// Also correct — wrapped label
<label>
  Email address
  <input type="email" name="email" />
</label>
```

Error messages need to be programmatically associated with their input:

```jsx
<div>
  <label htmlFor="email">Email address</label>
  <input
    type="email"
    id="email"
    aria-describedby={error ? 'email-error' : undefined}
    aria-invalid={!!error}
  />
  {error && (
    <span id="email-error" role="alert">
      {error}
    </span>
  )}
</div>
```

`aria-describedby` connects the input to the error message by ID. `aria-invalid` communicates the error state. `role="alert"` causes the error message to be announced automatically by screen readers when it appears.

---

## Building Accessible Custom Components

This is where React accessibility gets genuinely difficult. Custom interactive components — dropdowns, modals, tabs, accordions — need to implement keyboard navigation and ARIA patterns that native HTML handles automatically.

The [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) (APG) documents the expected keyboard and ARIA patterns for every common component. Before building a custom component, check the APG first.

### Modal Dialog

A modal dialog has specific requirements: focus must move into the modal when it opens, keyboard focus must be trapped inside the modal, pressing Escape should close it, and focus must return to the trigger element when it closes.

```jsx
function Modal({ isOpen, onClose, title, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      // Focus the first focusable element in the modal
      const focusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    } else {
      // Restore focus when modal closes
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') trapFocus(e, modalRef.current);
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={modalRef}>
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose}>Close</button>
    </div>
  );
}
```

In practice, use a battle-tested library like Radix UI or Headless UI for modals — they implement these patterns correctly and are maintained by teams who follow the ARIA spec closely. Only build custom from scratch if you have a specific reason.

### Tabs

```jsx
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      setActiveIndex((index + 1) % tabs.length);
    }
    if (e.key === 'ArrowLeft') {
      setActiveIndex((index - 1 + tabs.length) % tabs.length);
    }
    if (e.key === 'Home') setActiveIndex(0);
    if (e.key === 'End') setActiveIndex(tabs.length - 1);
  };

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={index !== activeIndex}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
```

The key patterns: `role="tablist"` on the container, `role="tab"` on each tab, `aria-selected` to indicate active tab, `tabIndex={-1}` on inactive tabs (with 0 on the active), and arrow key navigation.

---

## Colour Contrast

WCAG 2.1 AA requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text (18pt+ or 14pt+ bold). This is frequently failed in design systems where subtle grey-on-white text looks elegant but doesn't pass.

Check contrast ratios with:
- Chrome DevTools > Elements > Accessibility pane (shows contrast ratio for selected element)
- WebAIM Contrast Checker
- Figma plugins like Contrast or Stark

When implementing a design that contains insufficient contrast, flag it to the designer before building it. Fixing contrast at the design stage is free; retrofitting it across a deployed design system is expensive.

---

## Focus Indicators

Every interactive element must have a visible focus indicator. WCAG 2.1 AA requires that the focus indicator is visible — it doesn't prescribe exactly what it looks like.

```css
/* Don't do this */
:focus {
  outline: none;
}

/* Do this — custom visible focus style */
:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
```

Use `:focus-visible` rather than `:focus` to show the indicator only for keyboard navigation (not mouse clicks), which is now well-supported across modern browsers.

---

## Testing for Accessibility

### Automated testing

Automated tools catch approximately 30–40% of WCAG failures. They're necessary but not sufficient.

**axe-core** is the most accurate automated accessibility testing library. Integrate it into your test suite:

```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('Modal has no accessibility violations', async () => {
  const { container } = render(<Modal isOpen title="Test" onClose={() => {}} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Lighthouse** in Chrome DevTools runs an automated accessibility audit as part of its performance report. Run it on every major page of your application.

### Manual testing

Always follow automated testing with manual testing:

1. **Keyboard-only navigation:** Tab through the entire page without using a mouse. Every interactive element should be reachable, operable, and have a visible focus indicator.

2. **Screen reader testing:** Use VoiceOver (Mac/iOS) or NVDA (Windows, free) with your browser. Navigate to your most complex interactive components and verify they're announced correctly.

3. **Zoom to 200%:** Everything should remain readable and usable at 200% zoom without horizontal scrolling.

---

## Conclusion

WCAG 2.1 AA compliance in React is achievable without significant development overhead if you build accessible patterns from the start. The biggest gains come from the fundamentals: semantic HTML, properly associated labels, visible focus indicators, and correct ARIA usage on custom components.

For complex interactive components — modals, comboboxes, date pickers — use a well-maintained headless library (Radix UI, Headless UI, React Aria) rather than building from scratch. These libraries implement the ARIA patterns correctly so you can focus on the design layer.

---

## TL;DR

- **Start with semantic HTML** — native elements give you keyboard, ARIA, and focus behaviour for free
- **All form inputs need labels** — use `htmlFor`/`id` association or wrapping labels, never omit them
- **Associate errors with inputs** — `aria-describedby` + `aria-invalid` + `role="alert"` on the error
- **Custom components need ARIA patterns** — check the ARIA Authoring Practices Guide; use Radix UI or Headless UI for complex patterns
- **Colour contrast:** 4.5:1 for normal text, 3:1 for large text — check designs before building
- **Never remove focus outlines** — use `:focus-visible` for custom visible styles
- **Test with axe-core + keyboard navigation + screen reader** — automated tools only catch ~35% of issues
