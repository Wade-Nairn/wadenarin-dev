---
title: "Agentic Coding Workflows: How I Let AI Handle the Boilerplate"
description: "What agentic coding actually looks like in a real frontend workflow — which tasks to delegate, how to structure the handoff, and where to keep humans in the loop."
slug: "/articles/agentic-coding-workflows-frontend"
publishOrder: 23
category: "AI Agents"
date: "2025-05-05"
---

# Agentic Coding Workflows: How I Let AI Handle the Boilerplate

"Agentic AI" is a term that means different things in different contexts. At the research level, it describes autonomous systems that plan, execute, and self-correct over long horizons. For most frontend developers today, it means something more immediate and practical: using AI tools that can take a goal, break it into steps, and execute multiple actions in sequence — with you reviewing the output rather than writing every line.

This article is about the practical version: the specific workflows I use where AI handles a task end-to-end, and the patterns I've developed for deciding when to delegate, how to structure the handoff, and when to take back control.

---

## What "Agentic" Means in Practice for Frontend Developers

A single-shot AI interaction looks like: I write a prompt, I get a response, I decide what to do with it. This is most AI usage today — productive, but still largely manual.

An agentic interaction looks like: I describe a goal, the AI breaks it into steps, executes multiple steps in sequence, checks its own work, and presents me with a result I review and adjust. Tools like Claude Code, Cursor's Composer mode, and GitHub Copilot Workspace are moving toward this model.

The practical difference: agentic tools can handle tasks that have multiple sub-steps — not just "write this function" but "look at the existing codebase, understand the patterns, write the new feature that matches them, and update the relevant tests."

For frontend development, the tasks that benefit most from this approach share a few characteristics:
- Well-defined scope with clear success criteria
- Repetitive structure (the AI has seen similar patterns many times)
- Not requiring novel design judgment
- Where the cost of a mistake is low (easily caught and corrected)

---

## Workflow 1: Component Generation from Design Specs

The task: given a Figma design description or a screenshot, generate a React component that matches it, including responsive behaviour, states, and Storybook stories.

**How I structure the handoff:**

```
Task: Generate a PricingCard component

Design spec:
- White card with 1px border and subtle shadow
- Title: tier name (string)
- Price: monthly price in AUD with /mo suffix
- Feature list: array of strings, each with a checkmark icon
- CTA button: full-width, label is a prop
- Featured variant: highlighted with primary colour border and background tint

Requirements:
- TypeScript with proper prop types
- Tailwind CSS for styling
- Responsive: full width on mobile, fixed 320px on desktop
- Hover state on the card
- Storybook story for each variant (standard, featured)

Existing patterns in this codebase:
- Button component is in /components/ui/Button.tsx
- Colours use CSS custom properties from /styles/tokens.css
- Storybook stories use the CSF3 format
```

**What the AI produces:** A complete component file, the types file (or inline types), and a Storybook stories file. The output is ~80-90% correct and requires review and adjustment, but the structure, logic, and patterns are all in place.

**Where I add value:** Reviewing the component against the actual design (pixel accuracy, edge cases with long text), checking that the TypeScript is correct, verifying the Storybook stories actually render correctly.

**Time saved:** What might take 45-60 minutes to write carefully from scratch takes 10-15 minutes to generate, review, and adjust.

---

## Workflow 2: Test Generation

The task: given an existing component, generate a comprehensive test suite using Testing Library and Vitest.

This is one of the highest-value agentic workflows because test writing is time-consuming, structurally repetitive, and AI handles it well.

**Effective prompt structure:**

```
Generate a test suite for the Modal component at /components/Modal.tsx.

Testing library: Vitest + React Testing Library
Test file location: /components/Modal.test.tsx

Cover:
- Renders correctly when isOpen is true
- Does not render when isOpen is false
- Calls onClose when Escape is pressed
- Calls onClose when close button is clicked
- Traps focus within the modal
- Restores focus to the trigger element on close
- Shows the title from the title prop
- Renders children correctly
- Accessibility: has role="dialog" and aria-modal="true"

Existing test patterns to follow: [paste an example test from the codebase]
```

**What I always check:** Whether the generated tests actually test the behaviour (not just that something renders), whether edge cases are covered (what if onClose is undefined?), and whether the tests use the correct query patterns for accessible queries.

---

## Workflow 3: Codebase Documentation

The task: generate or update documentation for a component library, API surface, or architectural decision.

AI is excellent at reading code and producing accurate documentation — better, in many cases, than the developer who wrote the code, because it can see patterns the author might take for granted.

**For component documentation:**

```
Read the Button component at /components/ui/Button.tsx and generate:
1. A JSDoc comment for the component and each prop
2. A usage examples section showing the four main variants
3. An accessibility notes section

Format: MDX, compatible with our Storybook docs setup
```

**For ADR (Architecture Decision Record) generation:**

```
I just made a decision to use Zustand instead of Redux for state management 
in this project. Generate an ADR documenting:
- The context (why we needed state management)
- The options we considered (Context, Zustand, Redux Toolkit)
- The decision and the reasoning
- The consequences (positive and negative)

Current project: React + Next.js + TypeScript, 3-person team, B2B SaaS dashboard
```

---

## Workflow 4: Refactoring with Preserved Behaviour

The task: refactor a component or module to improve its structure while preserving its existing behaviour. This is where agentic tools start to show their ceiling.

AI handles straightforward refactoring well:
- Extracting reusable logic into custom hooks
- Converting class components to function components
- Breaking a large component into smaller focused ones
- Migrating from one styling system to another

AI handles complex refactoring poorly:
- Refactoring that requires understanding business logic that's implicit in the code
- Changes where the correct behaviour is ambiguous or has edge cases specific to your domain
- Refactors that require coordination across many files with complex interdependencies

**My rule:** Before delegating a refactor, write the tests first (or ask AI to write them, then verify they're correct). If tests exist that prove the behaviour, the refactoring can be verified automatically. Without tests, you're relying on the AI (and yourself) to keep track of what the code was supposed to do — risky.

---

## Workflow 5: Accessibility Audit and Remediation

The task: audit a component for accessibility issues and generate fixes.

```
Audit this form component for WCAG 2.1 AA accessibility issues.

[paste component code]

For each issue found:
1. Describe the WCAG criterion it violates
2. Explain the impact on users
3. Provide the corrected code

Also check for:
- Label association for all inputs
- Error message association with aria-describedby
- Focus indicator visibility
- Keyboard accessibility for all interactive elements
```

AI catches a meaningful percentage of accessibility issues — particularly the structural ones (missing labels, incorrect ARIA attributes). It misses the more subtle issues (insufficient focus indicator contrast, complex widget keyboard interaction failures) that require actual manual testing.

**Practical use:** Run AI accessibility audit as a first pass, then follow with axe-core and manual keyboard testing. The combination catches more than either alone.

---

## Where to Keep Humans in the Loop

Agentic workflows work best with human review checkpoints. Here's where I always stop and review:

**Before accepting any generated code:**
- Read every line. Not skim — read.
- If there's a line I don't understand, ask the AI to explain it before accepting.
- If the explanation doesn't satisfy me, rewrite the relevant part.

**For security-adjacent code:**
- Authentication, authorisation, payment flows, input validation — review more carefully, not less, just because AI generated it.

**For anything customer-facing:**
- Test manually in a browser. Not just unit tests — actual usage.

**For state management or data flow changes:**
- Trace the data flow yourself to verify it matches expectations.

---

## Setting Up Effective Context

The quality of agentic output scales directly with the quality of context provided. What I include in every agentic task:

**File structure context:** Which files are relevant, where patterns are defined, where tests live.

**Existing patterns:** Paste an example of how similar things are done in the codebase. AI will match your patterns if you show them; it will invent its own if you don't.

**Explicit constraints:** What's out of scope, what libraries to use or avoid, what patterns to follow.

**Success criteria:** What "done" looks like — what tests should pass, what the output should look like.

---

## Conclusion

Agentic coding workflows are most valuable for the tasks that are well-defined, structurally repetitive, and don't require deep business logic judgment. Component generation, test writing, documentation, and first-pass refactoring all benefit significantly from this approach.

The constraint isn't AI capability — it's the quality of the task definition you provide and the quality of your review process for the output. Both remain human responsibilities.

---

## TL;DR

- **Best tasks for agentic delegation:** component generation from specs, test suite creation, documentation, straightforward refactoring, accessibility audit first pass
- **Avoid delegating:** novel design decisions, security-critical code, complex business logic, refactors with no existing tests
- **Effective context:** file structure, existing patterns (paste examples), explicit constraints, clear success criteria
- **Always review:** read every line before accepting; understand before accepting; test manually
- **The ceiling:** agentic tools are limited by task definition quality and review discipline — both remain human
