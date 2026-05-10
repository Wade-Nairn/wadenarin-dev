---
title: "How I Built My Frontend Portfolio (and the Tech Choices Behind It)"
description: "A behind-the-scenes look at the decisions, tools, and tradeoffs that went into building a frontend developer portfolio — from framework choice to animation to performance."
slug: "/articles/building-my-frontend-developer-portfolio"
publishOrder: 12
category: "Creative"
date: "2025-05-05"
---

# How I Built My Frontend Portfolio (and the Tech Choices Behind It)

A frontend developer's portfolio is an unusual project. It's simultaneously a piece of marketing (convincing clients or employers to hire you), a technical demonstration (showing what you can build), and a creative expression (communicating your aesthetic sense). Those three goals can pull in different directions — a portfolio optimised for performance might sacrifice the expressive animations that demonstrate creative development skills, for example.

This article walks through the decisions I made building my portfolio: what I chose and why, where I made tradeoffs, what I'd do differently, and the things that actually mattered versus the things I thought would matter.

---

## The Goals, Stated Clearly

Before any tech decisions, I established what the portfolio needed to do:

1. **Communicate who I am professionally** — a frontend developer with a focus on creative development, technical depth, and clean UI
2. **Show, don't just tell** — demonstrate skills through the quality of the thing itself, not just screenshots of other work
3. **Load fast and score well on Core Web Vitals** — a developer's portfolio with poor performance is a credibility problem
4. **Be easy to update** — not so complex that adding a new project becomes a day's work
5. **Work perfectly on mobile** — Australian clients and recruiters are not all on desktop

One goal I explicitly deprioritised: being an original, never-before-seen design. The temptation to build something conceptually groundbreaking often leads to portfolios that are hard to navigate and communicate less than a well-executed conventional layout. Clarity over cleverness, unless the cleverness serves the communication.

---

## Framework Choice: Why Astro

I chose [Astro](https://astro.build) as the foundation, and I'd make the same choice again.

Astro is built for content-heavy sites. By default, it ships zero JavaScript to the browser — pages are static HTML unless you explicitly opt into client-side interactivity. For a portfolio where most pages are static content, this default is exactly right.

The performance implications are significant. A portfolio built in vanilla Astro can hit near-perfect Lighthouse scores without heroic optimisation effort, because there's simply no JavaScript framework runtime to parse and execute. Pages load fast, Core Web Vitals are strong, and Google is happy.

Astro's component model supports importing components from multiple frameworks — React, Vue, Svelte — with the `client:` directive controlling hydration. This means I could write the interactive sections in React (which I know well) while keeping the static content as server-rendered HTML. Best of both worlds.

**What I considered and rejected:**
- **Next.js** — overkill for a portfolio. Server-side rendering and API routes aren't needed; the complexity would be overhead without benefit.
- **Gatsby** — once the go-to for portfolio sites, but has lost ground to Astro for static-first builds
- **SvelteKit** — genuinely tempting, but I wanted React interactivity for specific components and the hybrid approach would have been messier

---

## Styling: Tailwind CSS

I use Tailwind CSS for all styling. This is a pragmatic choice: I know it well, it's fast to work with, and the constraints of utility classes actually help decision-making (you're choosing from predefined spacing and sizing values rather than making up numbers).

For a portfolio specifically, Tailwind's JIT compiler means the final CSS bundle contains only the classes actually used — which for a site this size is a very small file.

**The custom design system:** Tailwind's default configuration was extended with custom colours, typography scale, and spacing to match the visual design. Having these values in the Tailwind config rather than scattered as arbitrary CSS values means they're consistent and easy to change globally.

**Animations:** For most animations I used either native CSS animations or Framer Motion for the more complex interactive pieces. Framer Motion adds JavaScript weight, so I was deliberate about where I used it — only where the animation genuinely added value that CSS couldn't match.

---

## The Case Studies: What to Actually Show

The most important design decision for a portfolio isn't visual — it's what to put in it.

I settled on three to five case studies rather than a gallery of screenshots. Each case study follows the same structure:

- **The problem:** What was the client or project trying to achieve?
- **My role:** What specifically did I work on?
- **The approach:** What technical decisions did I make and why?
- **The outcome:** What shipped, and what were the results?

This structure forces me to communicate like a professional rather than a designer showing off screenshots. Clients and hiring managers care about problem-solving more than aesthetics.

**Quality over quantity.** A portfolio with three excellent, well-documented case studies is more compelling than one with fifteen projects presented as thumbnail grids. I was ruthless about only including work I'm proud of and can speak to in detail.

---

## Performance: The Numbers That Matter

For a frontend developer's portfolio, the Lighthouse scores are visible evidence of whether you can do what you claim to do. Here's where I landed:

- **Performance:** 98
- **Accessibility:** 100
- **Best Practices:** 100
- **SEO:** 100

Getting to 98 on Performance required:
- Preloading the hero image with `fetchpriority="high"`
- Converting all images to WebP format
- Lazy-loading below-the-fold images with `loading="lazy"`
- Minimal JavaScript — only what's needed for the interactive components
- Self-hosted fonts with `font-display: swap` and size-adjusted fallbacks

The accessibility 100 required semantic HTML throughout, proper heading hierarchy, all images with meaningful alt text, sufficient colour contrast, and keyboard-navigable interactive components.

---

## The Creative Section: Demonstrating Creative Dev Skills

My portfolio has a "Lab" or "Experiments" section that exists specifically to demonstrate creative development capabilities — the things that don't fit into client case studies.

This section includes:
- A WebGL shader experiment built with Three.js
- A generative art piece using the canvas API
- A GSAP scroll animation demo

These pieces are deliberately more experimental than the case study work. They signal to potential clients that I can build things at the intersection of code and visual craft — not just standard web applications.

The technical cost: these experiments add JavaScript weight and were the main reason my Performance score isn't 100 rather than 98. I accepted this tradeoff because demonstrating the creative capability is more valuable than a perfect score.

---

## Content: The Writing

The portfolio includes a blog (this one) because written content is the most effective SEO lever available to a freelance developer. Case studies demonstrate work; articles demonstrate thinking. Both matter to different audiences.

I write for two distinct readers:
- **Potential clients** — the Australian localisation articles, the "how to hire" guides
- **Other developers** — the technical articles, which demonstrate depth and attract professional community

The overlap between these audiences is smaller than you'd think. Optimise each type of article for its intended reader.

---

## What I'd Do Differently

**Start with the content, not the design.** I spent too long on visual design before I knew what content the portfolio would contain. The best portfolios are content-first — the design serves the content, not the other way around.

**Ship sooner.** My first version went live later than it should have because I was waiting until it was "ready." A published portfolio that's 80% of what you want beats an unpublished one that's 100%. You can iterate after launching.

**Write case studies in parallel with projects.** It's much harder to write a case study six months after a project than immediately after it wraps. The details are fresher, the client context is accessible, and the outcome data is more available.

---

## Conclusion

A frontend portfolio is never truly finished — it's a living document that should evolve with your work and your career. The most important things are that it clearly communicates who you are, loads fast, and contains real evidence of your capabilities. Everything else is secondary.

The tech choices matter less than most developers think. Astro, Next.js, Gatsby, or a hand-rolled static site can all be made to work. What separates strong portfolios from weak ones is almost always the quality of the case studies and the clarity of the positioning.

---

## TL;DR

- **Framework:** Astro — zero-JS by default, perfect for mostly-static portfolios, excellent performance baseline
- **Styling:** Tailwind CSS with a custom design token config
- **Animations:** native CSS for simple, Framer Motion for complex — used sparingly
- **Content strategy:** 3–5 detailed case studies beats a gallery of screenshots
- **Performance targets:** 98+ Lighthouse — achievable with preloaded hero image, WebP, minimal JS
- **Creative section:** intentional experiments to demonstrate skills that don't show in client work
- **What matters most:** case study quality and clear positioning — tech stack is secondary
