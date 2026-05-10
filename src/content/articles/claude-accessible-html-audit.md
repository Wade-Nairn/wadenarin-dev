---
title: "Using Claude to Write Accessible HTML: Does It Actually Pass Audits?"
description: "I asked Claude to write accessible HTML components and then ran them through real accessibility audits — axe-core, Lighthouse, and manual screen reader testing. Here's what passed and what failed."
slug: "/articles/claude-accessible-html-audit"
publishOrder: 21
category: "AI Coding"
date: "2025-05-05"
---

# Using Claude to Write Accessible HTML: Does It Actually Pass Audits?

AI assistants confidently write "accessible" code. But accessibility is one of those domains where confidently wrong is worse than openly uncertain — a component that looks accessible, passes a quick glance, but fails a real audit gives developers false confidence and users a broken experience.

I wanted to know whether Claude's HTML output actually passes accessibility audits. Not based on whether it uses semantic HTML (it does), but based on whether the code passes axe-core automated testing, achieves a high Lighthouse accessibility score, and — most importantly — works correctly with a real screen reader.

This article documents the experiment: what I asked Claude to build, what it produced, how I tested it, and what passed versus what needed fixing.

---

## The Experiment Setup

I asked Claude (claude-sonnet-4-6) to build five common UI components, each with a specific prompt requesting accessibility. I then:

1. Dropped each component into a test page
2. Ran axe-core via the browser extension (capturing all violations)
3. Ran Lighthouse and recorded the accessibility score
4. Navigated with keyboard only (no mouse) through each component
5. Tested with VoiceOver on macOS, navigating with typical screen reader patterns

The components tested:
1. A navigation menu with dropdown submenus
2. A modal dialog with form inputs
3. A data table with sortable columns
4. A custom select/combobox
5. A set of tabs

---

## Component 1: Navigation with Dropdowns

**The prompt:** "Build a navigation bar with a logo on the left, three top-level links in the center, and the third link has a dropdown submenu with four items. Make it keyboard accessible and screen reader friendly."

**What Claude produced:**

```html
<nav aria-label="Main navigation">
  <a href="/" class="logo">Brand</a>
  <ul role="list">
    <li><a href="/about">About</a></li>
    <li><a href="/services">Services</a></li>
    <li>
      <button 
        aria-expanded="false" 
        aria-haspopup="true"
        aria-controls="work-menu"
      >
        Work
      </button>
      <ul id="work-menu" role="list" hidden>
        <li><a href="/work/web">Web</a></li>
        <li><a href="/work/mobile">Mobile</a></li>
        <li><a href="/work/brand">Brand</a></li>
        <li><a href="/work/motion">Motion</a></li>
      </ul>
    </li>
  </ul>
</nav>
```

(Simplified — Claude also produced JavaScript to toggle the dropdown and handle keyboard events.)

**Audit results:**
- axe-core: 0 violations ✅
- Lighthouse accessibility: 100 ✅
- Keyboard navigation: Tab to the "Work" button, Enter opens the dropdown, arrow keys navigate items, Escape closes — all correct ✅
- VoiceOver: Announced "Work, button, collapsed" initially; after activation, "expanded" and read the submenu items correctly ✅

**Verdict:** Passed completely. Claude used the correct pattern — a `<button>` with `aria-expanded`, `aria-haspopup`, and `aria-controls` rather than making the trigger a link or div.

---

## Component 2: Modal Dialog with Form

**The prompt:** "Build a modal dialog with a form containing name and email inputs and a submit button. The modal should be triggered by a button, trap focus inside, close on Escape, and restore focus to the trigger when it closes."

**Audit results:**
- axe-core: 0 violations ✅
- Lighthouse: 100 ✅
- Keyboard: Focus moved to modal on open, Tab cycled through inputs and button only (no focus escape), Escape closed and restored focus to trigger ✅
- VoiceOver: "Dialog, Contact us" announced on open; inputs announced with correct labels; ✅

**What Claude got right:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the dialog title, focus trap implementation, Escape key handling, and focus restoration.

**One issue:** Claude's initial implementation didn't handle the case where the modal is inside a `<div>` rather than `<body>` — the `aria-modal` attribute requires either the modal to be at the top level or for everything outside the modal to have `aria-hidden="true"`. I had to prompt for a follow-up fix for this.

**Verdict:** Mostly passed. Required one follow-up prompt to handle `aria-hidden` on the background correctly.

---

## Component 3: Sortable Data Table

**The prompt:** "Build a data table showing user data (name, email, role, joined date) with sortable columns. Make it accessible with appropriate ARIA."

**Audit results:**
- axe-core: 1 violation — missing `scope` attribute on header cells ⚠️
- Lighthouse: 95 ⚠️
- Keyboard: Tab reached sortable headers, Enter/Space toggled sort ✅
- VoiceOver: Table announced correctly, but column sort state not clearly communicated ⚠️

**The violations:** Claude used `<th>` elements but omitted `scope="col"` on column headers. It also used `aria-sort="ascending"` correctly, but the sort direction wasn't announced clearly enough by VoiceOver in practice.

**After prompting for fixes:** Added `scope="col"` to all `<th>` elements and added a visually-hidden text description of the current sort state alongside the `aria-sort` attribute. Post-fix: axe-core 0 violations, Lighthouse 100.

**Verdict:** Required a follow-up fix but Claude corrected it immediately when asked. The fix was minor.

---

## Component 4: Custom Combobox (Select)

This was the hardest component to get right, and it showed.

**The prompt:** "Build a custom combobox that lets users search for a country from a list. It should be keyboard navigable and accessible."

**First attempt audit results:**
- axe-core: 3 violations — missing role, incorrect aria-expanded placement, listbox not properly associated ❌
- Keyboard: Partially worked — could open, could type, but arrow key navigation through results was broken ❌
- VoiceOver: Announced the input but didn't announce the listbox results ❌

**What went wrong:** Custom comboboxes are one of the most difficult ARIA patterns to implement correctly. Claude's first attempt followed an older pattern that's been superseded by the ARIA 1.2 combobox spec.

**After prompting for the ARIA 1.2 combobox pattern specifically:**

The corrected implementation used:
- `role="combobox"` on the input
- `aria-expanded` on the input
- `aria-controls` pointing to the listbox
- `aria-activedescendant` pointing to the currently highlighted option
- `role="listbox"` on the results container
- `role="option"` and `aria-selected` on each result item

Post-fix: axe-core 0 violations, keyboard and VoiceOver worked correctly.

**Verdict:** First attempt failed. Required specific prompting about the ARIA 1.2 pattern. This reflects the genuine difficulty of the combobox pattern — not specifically a Claude failure. The lesson: for complex ARIA patterns, be specific about which spec version you want.

---

## Component 5: Tabs

**Audit results:**
- axe-core: 0 violations ✅
- Lighthouse: 100 ✅
- Keyboard: Arrow keys navigate between tabs, Tab moves to panel content ✅
- VoiceOver: Tabs announced with selected state, panel content accessible ✅

Claude correctly implemented the ARIA Authoring Practices Guide tab pattern: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, `aria-labelledby`, and the arrow-key navigation pattern.

**Verdict:** Passed completely.

---

## Overall Findings

| Component | axe-core | Lighthouse | Keyboard | VoiceOver | Overall |
|---|---|---|---|---|---|
| Navigation | ✅ Pass | 100 | ✅ Pass | ✅ Pass | ✅ |
| Modal | ✅ Pass* | 100 | ✅ Pass | ✅ Pass | ✅* |
| Data Table | ⚠️ Minor | 95 | ✅ Pass | ⚠️ Minor | ⚠️ |
| Combobox | ❌ Fail | — | ❌ Fail | ❌ Fail | ❌ → ✅* |
| Tabs | ✅ Pass | 100 | ✅ Pass | ✅ Pass | ✅ |

*Required follow-up prompt to fully pass

---

## What This Means for Your Workflow

Claude writes accessible HTML that's better than average developer output for most components. The navigation, modal, and tabs implementations were all correct on the first attempt — which is better than many human-written implementations I've audited.

The combobox failure was genuine and reflects the genuine complexity of that ARIA pattern. The lesson isn't "Claude fails at accessibility" — it's that comboboxes are hard, and you should use a well-maintained library (Radix UI, Headless UI, React Aria) for them rather than building from scratch, whether you're using AI or not.

**Practical recommendation:** Use Claude to generate accessible component structures, then run axe-core before shipping. The two-step process — generate with AI, validate with axe-core — catches the issues that slip through and gives you confidence that the output is correct.

---

## TL;DR

- **Navigation, modal, tabs:** Passed all audits on first attempt — correct ARIA patterns, keyboard navigation, screen reader support
- **Data table:** Minor issue (`scope` attribute) caught by axe-core, corrected immediately with a follow-up prompt
- **Combobox:** First attempt failed; correct ARIA 1.2 pattern required specific prompting — this reflects the genuine difficulty of combobox, not just Claude
- **Practical workflow:** Claude for structure + axe-core for validation = high confidence in accessible output
- **For complex patterns (combobox, date picker):** use Radix UI / Headless UI regardless — the ARIA complexity makes from-scratch implementation risky
