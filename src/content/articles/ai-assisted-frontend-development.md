---
title: "How I Use AI to Speed Up Frontend Development (Without Losing Control)"
description: "A practical look at how AI tools actually fit into a frontend development workflow — what works, what doesn't, and how to stay in control of your own codebase."
slug: "/articles/ai-assisted-frontend-development"
publishOrder: 4
category: "AI Coding"
date: "2025-05-05"
---

# How I Use AI to Speed Up Frontend Development (Without Losing Control)

The AI coding conversation tends to collapse into one of two camps. Camp one: AI will replace developers and everything is changing forever. Camp two: AI-generated code is garbage and real developers don't need it. Both camps are wrong, and both are missing the more interesting and practical question: what does actually useful AI-assisted development look like in a real frontend workflow?

I've been using AI tools seriously in my frontend work for over a year now. I've tried most of the major tools, developed opinions about what works and what doesn't, and — importantly — maintained a clear sense of where AI accelerates my work versus where it creates more problems than it solves. This article is about the latter: not a hype piece, not a dismissal, but a genuine account of how these tools fit (and don't fit) into production frontend development.

---

## The Tools I Actually Use

I'll focus on the three tools that have meaningfully changed my workflow:

**Cursor** is my primary editor. It's built on VS Code and integrates AI deeply — tab completion, an in-editor chat, and a Composer mode that can make multi-file changes. The tab completion alone has changed how I write repetitive code.

**Claude** (via claude.ai or the API) is where I think through problems, draft complex logic, and work through architecture questions. I treat it more like a senior colleague I can consult than an autocomplete engine.

**GitHub Copilot** I still have active, mostly as a fallback for contexts where Cursor isn't available. Its inline suggestions are solid for boilerplate.

---

## What AI Is Actually Good At in Frontend Work

### Boilerplate and repeated patterns

Frontend development involves a significant amount of structurally similar code. A new form component has a predictable shape. A new API call follows an established pattern. A new Storybook story looks a lot like the last twenty Storybook stories.

This is where AI earns its keep. In Cursor, I'll write the first two lines of a component — the import and function signature — and the tab completion will often nail the rest to 80-90% accuracy. I review it, tweak it, move on. What used to take five minutes takes ninety seconds.

### CSS and styling

AI is genuinely strong at CSS. Give it a Figma screenshot or a description of a layout and it will produce solid CSS quickly. It understands Flexbox and Grid well, knows common patterns, and rarely makes outright mistakes in straightforward layouts. I still review and tweak everything, but the first draft is usually good.

This is particularly useful for responsive variations. Describing what a layout should do at different breakpoints and asking AI to generate the media queries is faster than writing them manually, and the output is usually correct.

### Writing tests

This is an underrated use case. Give Claude a component and ask it to write a test suite using Testing Library and Vitest, and you'll get a solid first draft covering the obvious cases. It won't think of every edge case, and you need to review it carefully, but it handles the structural scaffolding well.

### Explaining unfamiliar code

I work across multiple codebases, some of which I didn't write. Pasting an unfamiliar function into Claude and asking it to explain what it does — and, crucially, why certain decisions might have been made — is faster than tracing through it manually.

### Debugging with a second perspective

When I'm stuck on a bug, explaining the problem to Claude often clarifies my own thinking (a written-out version of rubber duck debugging). But Claude also genuinely finds issues I've missed — particularly subtle type errors, race conditions in async code, and CSS specificity conflicts that are hard to spot visually.

---

## What AI Is Not Good At

### Understanding your specific codebase

AI has no persistent memory of your codebase. Every conversation starts cold. It doesn't know your naming conventions, your component architecture, which patterns you've decided to avoid, or the quirks of your specific tech stack combination. If you don't provide this context explicitly, you'll get generic code that may not fit your project.

The workaround — pasting relevant context into every prompt — works, but it's overhead. Cursor's codebase indexing helps with this, but it's imperfect, particularly for large projects.

### Architectural decisions

AI is good at implementing decisions. It's poor at making them. Ask it whether you should use Zustand or React Query for a particular state problem and you'll get a balanced "it depends" answer that's technically accurate but not actually helpful for your specific situation. The judgment calls — how to structure a complex feature, where to draw component boundaries, when to abstract versus inline — still require human understanding of your codebase and your team.

### Security-sensitive code

I treat AI-generated code that touches authentication, authorisation, payment flows, or sensitive data handling with extra scepticism. AI will produce code that looks correct and passes obvious tests while containing subtle vulnerabilities. This isn't unique to AI — it's true of any code you didn't write yourself — but the speed at which AI generates code means it's easy to accept it without sufficient scrutiny.

### Novel problems

AI performs well on problems it's seen before. Frontend development at the edges — complex canvas work, novel animation systems, cutting-edge browser APIs — is where AI struggles most. It may produce plausible-looking code that doesn't actually work, or it may give you outdated patterns that have been superseded.

---

## Staying in Control: The Principles I Work By

The risk of AI-assisted development isn't that the code is wrong — it's that you stop understanding the code. The moment you're shipping code you can't explain, you've lost the ability to debug it, maintain it, or make good decisions about it.

Here's how I stay in control:

**Read everything before it lands.** I review every line of AI-generated code before accepting it, the same way I'd review a pull request from a junior developer. This isn't paranoia — it's professional hygiene.

**Understand before accepting.** If I don't understand why a generated solution works, I ask the AI to explain it. If the explanation doesn't satisfy me, I rewrite the relevant part myself. Understanding isn't optional.

**Use AI for the first draft, not the final answer.** I treat AI output as a starting point, not a finished product. The first draft is often good; the final version is always mine.

**Keep context explicit.** When asking for help with something specific to my codebase, I paste the relevant code, explain the constraints, and describe what I've already tried. Vague prompts produce vague outputs.

**Test AI-generated code thoroughly.** The most dangerous AI output is the code that almost works. Run it, test edge cases, check against your requirements.

---

## The Honest Productivity Numbers

Over a typical week, I estimate AI tools save me two to three hours of writing time — mostly in the boilerplate and CSS categories. That's a meaningful gain without any loss of code quality or understanding.

The bigger gain, harder to quantify, is cognitive load. Not having to hold the entire syntax of a Storybook story in my head while I'm thinking about component design frees up mental bandwidth for the parts of the problem that actually require thought.

What AI hasn't done is fundamentally change the nature of frontend work. The hard parts — understanding user needs, making good architectural decisions, debugging complex interactions, writing clear and maintainable code — remain as demanding as they've always been.

---

## Conclusion

AI tools are a genuine productivity improvement for frontend development, and developers who aren't using them are leaving time on the table. But the productivity gain comes with a discipline requirement: you have to stay in control of the output, which means reading, understanding, and owning everything that goes into your codebase.

The developers who will do best with AI tools are the ones who use them to accelerate tasks they already understand — not to outsource tasks they don't.

---

## TL;DR

- **Best uses:** boilerplate generation, CSS drafting, writing tests, explaining unfamiliar code, debugging with a second perspective
- **Avoid using AI for:** architectural decisions, security-sensitive code, novel problems outside its training
- **Tools that work:** Cursor (daily editor), Claude (thinking partner), Copilot (fallback)
- **Stay in control:** read everything, understand before accepting, use AI for first drafts not final answers
- **Real productivity gain:** 2–3 hours per week on a typical project, plus meaningfully reduced cognitive load
- The hard parts of frontend development remain hard — AI accelerates the work around them
