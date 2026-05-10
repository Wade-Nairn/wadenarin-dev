---
title: "Building a Component Library from Scratch with Storybook"
description: "A practical guide to building a React component library with Storybook — from initial setup through writing stories, documentation, visual testing, and publishing."
slug: "/articles/component-library-storybook-guide"
publishOrder: 26
category: "Technical"
date: "2025-05-05"
---

# Building a Component Library from Scratch with Storybook

A component library is the foundation of a consistent UI. Storybook is the tool the industry has converged on for building, documenting, and testing component libraries — used by teams at Airbnb, Shopify, IBM, and most other organisations with serious design systems.

This guide covers building a component library with Storybook from scratch: setup, writing stories, documentation, visual regression testing, and publishing. The goal is a practical reference for teams starting a component library, not a documentation summary.

---

## Why Storybook

Storybook solves a specific problem: it lets you develop and test components in isolation, without needing to set up the full application context. A modal component needs to be testable without navigating to the part of the app that opens a modal. A button needs to be viewable in all its states — default, hover, focused, disabled, loading — simultaneously.

Beyond development isolation, Storybook produces a living documentation site that stays in sync with your actual components. The documentation is generated from the same code that runs in production, so it can't drift.

---

## Setup

Install Storybook into an existing React project:

```bash
npx storybook@latest init
```

This detects your framework (React, Next.js, Vite, etc.) and configures the appropriate presets. For a TypeScript + React + Vite setup, it will install `@storybook/react-vite` and configure `main.ts` accordingly.

The generated `.storybook/` directory contains:
- `main.ts` — Storybook configuration (addons, framework, story glob patterns)
- `preview.ts` — global decorators, parameters, and story defaults

Add global styles or providers in `preview.ts`:

```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../src/styles/globals.css';

const preview: Preview = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
```

---

## Writing Stories: The CSF3 Format

Stories describe a component in a specific state. The Component Story Format 3 (CSF3) is the current standard:

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'], // generates documentation automatically
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// Default story
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

// Secondary variant
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary action',
  },
};

// Disabled state
export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: 'Disabled',
    disabled: true,
  },
};

// Loading state
export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Loading...',
    isLoading: true,
  },
};
```

`tags: ['autodocs']` automatically generates a documentation page from the component's prop types and the story's `argTypes`. No manual documentation writing required — the docs stay in sync with the code.

---

## Structuring Your Component Library

A well-organised Storybook follows a consistent hierarchy. Common patterns:

```
Foundation/
  Colors
  Typography
  Spacing
  Icons

UI/
  Button
  Input
  Select
  Checkbox
  Badge

Layout/
  Card
  Modal
  Drawer
  Tabs

Navigation/
  Navbar
  Sidebar
  Breadcrumbs
  Pagination

Patterns/
  LoginForm
  DataTable
  EmptyState
```

The `title` field in each story's `meta` controls where it appears in the Storybook sidebar. Use slashes for nesting: `'UI/Button'`, `'Foundation/Colors'`.

---

## Writing Good Stories

Stories aren't just "show the component" — they document every meaningful state and variant that the component can be in. For a form input:

```typescript
// Input.stories.tsx

export const Default: Story = { args: { placeholder: 'Enter text...' } };

export const WithLabel: Story = {
  args: { label: 'Email address', placeholder: 'you@example.com' },
};

export const WithError: Story = {
  args: {
    label: 'Email address',
    placeholder: 'you@example.com',
    error: 'Please enter a valid email address',
    value: 'not-an-email',
  },
};

export const WithHelpText: Story = {
  args: {
    label: 'Password',
    type: 'password',
    helpText: 'Must be at least 8 characters',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Username',
    value: 'wade.nairn',
    disabled: true,
  },
};
```

The question to ask for each component: what states does this component have, and is each state documented with a story?

---

## Documentation with MDX

For components that need richer documentation — usage guidelines, design decisions, do/don't examples — Storybook supports MDX files that mix markdown with story renders:

```mdx
{/* Button.mdx */}
import { Canvas, Meta, Controls } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

Use buttons to trigger actions. Choose the variant based on the importance of the action.

## Variants

**Primary** — for the single most important action on a page. Use sparingly.
**Secondary** — for secondary actions that aren't the main CTA.
**Ghost** — for low-emphasis actions, often in lists or tables.
**Destructive** — for actions that delete or cannot be undone.

<Canvas of={ButtonStories.Primary} />
<Controls of={ButtonStories.Primary} />

## Do and don't

✅ Use a single Primary button per page section
❌ Don't stack multiple Primary buttons next to each other
✅ Use sentence case for button labels ("Save changes", not "Save Changes")
```

---

## Visual Regression Testing with Chromatic

Chromatic (built by the Storybook team) takes screenshots of every story and compares them against a baseline. When a code change affects the visual output of a component, Chromatic catches it.

```bash
npm install --save-dev chromatic
```

```bash
npx chromatic --project-token=<your-token>
```

Integrate into CI:

```yaml
# .github/workflows/chromatic.yml
- name: Publish to Chromatic
  uses: chromaui/action@v1
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

Each pull request now shows exactly which component stories changed visually, with a side-by-side diff. Visual regressions — "that button is 2px taller than it was" — are caught before they reach production.

---

## Accessibility Testing in Storybook

Install the accessibility addon:

```bash
npm install --save-dev @storybook/addon-a11y
```

Add to `.storybook/main.ts`:

```typescript
addons: ['@storybook/addon-a11y'],
```

Now every story panel has an "Accessibility" tab that runs axe-core against the rendered story and reports violations. This catches accessibility issues at the component level, before the component is integrated into the application.

---

## Publishing the Component Library

For internal distribution within a monorepo, configure your build tool (Vite, tsup, rollup) to build the components as a package:

```json
// package.json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  }
}
```

For external publishing (npm or a private registry), ensure your bundle doesn't include peer dependencies (React, React-DOM, etc.) in the output.

Publish the Storybook itself as a static site for stakeholders to browse:

```bash
npx storybook build -o storybook-static
```

Deploy the `storybook-static` directory to any static hosting service (Vercel, Netlify, GitHub Pages) for a shareable component documentation URL.

---

## Conclusion

A well-maintained Storybook is one of the highest-leverage investments a frontend team can make. It creates a shared language between designers and developers, prevents visual regressions through automated testing, and produces documentation that stays accurate without effort.

The setup investment is a few hours. The ongoing benefit — faster development, fewer regressions, clearer design handoffs — compounds over the life of the project.

---

## TL;DR

- **Setup:** `npx storybook@latest init` — auto-detects your framework
- **Stories:** CSF3 format; `tags: ['autodocs']` for automatic documentation; cover every meaningful state and variant
- **Structure:** hierarchical sidebar via the `title` field — Foundation → UI → Layout → Navigation → Patterns
- **MDX docs:** mix markdown and story renders for richer usage guidelines
- **Visual testing:** Chromatic for automated screenshot comparison on PRs
- **Accessibility:** `@storybook/addon-a11y` runs axe-core in the Storybook panel on every story
- **Publishing:** build as a package for internal use; deploy static Storybook for stakeholder browsing
