---
title: "Building a UI Component Generator with the Claude API"
description: "A step-by-step guide to building a tool that generates React UI components from natural language descriptions using the Claude API — covering prompt engineering, output parsing, and rendering."
slug: "/articles/ui-component-generator-claude-api"
publishOrder: 25
category: "AI Agents"
date: "2025-05-05"
---

# Building a UI Component Generator with the Claude API

A UI component generator takes a natural language description — "a pricing card with three tiers and a highlighted recommended option" — and produces working React component code. This is exactly the kind of task the Claude API handles well, and it's a genuinely useful tool for rapid prototyping and design exploration.

This article walks through building one from scratch: the API integration, prompt engineering for consistent code output, parsing and rendering the generated component, and handling the inevitable edge cases.

---

## What We're Building

A web interface where you:
1. Type a component description
2. Click "Generate"
3. See the generated React code
4. Optionally preview the rendered component

The stack: Next.js (App Router), the Anthropic SDK, and a live preview using a sandboxed iframe or a dynamic component renderer.

---

## Setup

Install the Anthropic SDK:

```bash
npm install @anthropic-ai/sdk
```

Add your API key to `.env.local`:

```
ANTHROPIC_API_KEY=your-api-key-here
```

Never expose the API key to the client — all Claude API calls go through a server route.

---

## The API Route

```typescript
// app/api/generate-component/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const { description } = await request.json();
  
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: buildPrompt(description),
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Unexpected response type' }, { status: 500 });
  }

  const code = extractCode(content.text);
  
  return NextResponse.json({ code });
}
```

---

## Prompt Engineering: Getting Consistent Output

The quality and consistency of generated components depends heavily on the prompt. A vague prompt produces variable output; a precise prompt produces structured, usable code.

```typescript
function buildPrompt(description: string): string {
  return `Generate a React component based on this description:

"${description}"

Requirements:
- Use TypeScript with proper prop types
- Use Tailwind CSS for all styling
- Export the component as the default export
- Name the component descriptively (PascalCase)
- Include TypeScript interface for props
- Make it responsive (mobile-first)
- Include hover and focus states for interactive elements
- Use semantic HTML elements

Output ONLY the component code inside a single \`\`\`tsx code block. No explanations, no imports beyond React (assume Tailwind is available globally). Do not include any text outside the code block.

Example output format:
\`\`\`tsx
interface ComponentNameProps {
  // props here
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  return (
    // JSX here
  );
}
\`\`\``;
}
```

Key prompt engineering decisions:

**Explicit output format.** Specifying "output ONLY the component code inside a single tsx code block" reduces the likelihood of Claude adding explanatory text that would need to be stripped out.

**No import statements.** Asking Claude not to include imports beyond React keeps the output cleaner. The rendering environment can handle its own imports, and React imports are universal.

**Specific constraints.** TypeScript, Tailwind, semantic HTML, hover states — these constraints produce more consistent, higher-quality output than an open-ended request.

---

## Parsing the Generated Code

```typescript
function extractCode(text: string): string {
  // Match code between ```tsx or ```jsx or ``` markers
  const codeBlockRegex = /```(?:tsx|jsx|typescript|javascript)?\n([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  
  if (!match) {
    // Fallback: return the raw text if no code block found
    return text.trim();
  }
  
  return match[1].trim();
}
```

This handles the common cases: Claude might use ` ```tsx `, ` ```jsx `, ` ```typescript `, or just ` ``` ` as the code fence marker.

---

## The UI

```tsx
// app/page.tsx
'use client';

import { useState } from 'react';

export default function ComponentGenerator() {
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!description.trim()) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const data = await response.json();
      setCode(data.code);
    } catch (err) {
      setError('Failed to generate component. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">UI Component Generator</h1>
        
        <div className="mb-6">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the component you want to generate..."
            className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-4 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !description.trim()}
            className="mt-3 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Generating...' : 'Generate Component'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950 border border-red-800 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {code && (
          <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span className="text-sm text-gray-400">Generated Component</span>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-auto text-sm text-gray-300">
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Adding Streaming for Faster Perceived Performance

With `max_tokens: 4096`, generation can take 5-15 seconds. Streaming the response token by token gives users immediate feedback and makes the tool feel more responsive:

```typescript
// app/api/generate-component/route.ts (streaming version)
export async function POST(request: NextRequest) {
  const { description } = await request.json();

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(description) }],
  });

  const encoder = new TextEncoder();
  
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
```

On the client, read the stream incrementally and update the code display as chunks arrive.

---

## Adding Component Variations

Extend the generator to produce multiple variations of the same component:

```typescript
function buildVariationsPrompt(description: string): string {
  return `Generate THREE different React component variations based on this description:

"${description}"

For each variation, provide a different visual design approach (e.g., minimal, bold, card-based).

Output three separate \`\`\`tsx code blocks, each preceded by a comment line: // Variation 1: [name], // Variation 2: [name], // Variation 3: [name]`;
}
```

Parse the multiple code blocks separately and let the user choose which to use or copy.

---

## Error Handling and Edge Cases

**Rate limiting:** The Claude API has rate limits. Add retry logic with exponential backoff for production use.

**Malformed output:** Sometimes Claude doesn't follow the output format precisely. The `extractCode` function's fallback handles cases where no code block is found, but validate that the extracted code is syntactically reasonable before displaying.

**Long descriptions:** Very detailed descriptions can push the context window. Truncate input descriptions to a reasonable maximum (500 characters) at the UI level.

**Content policy:** Claude will decline to generate some types of content. Handle error responses from the API gracefully.

---

## Conclusion

A UI component generator built on the Claude API is one of the most immediately useful developer tools you can build. The core is straightforward — a prompt, an API call, code extraction — and the value is genuine: rapid prototyping velocity for anyone who can describe what they want in natural language.

The prompt engineering is the most important investment. Spend time getting consistent, high-quality output from the prompt before building more features around it.

---

## TL;DR

- **Architecture:** Next.js API route → Anthropic SDK → prompt → extract code → return to client
- **Never expose API keys client-side** — all API calls go through server routes
- **Prompt engineering is the critical investment:** explicit output format, specific constraints (TypeScript, Tailwind, semantic HTML), no explanatory text
- **Parse code blocks** with regex matching ` ```tsx ` fences; include fallback for malformed output
- **Streaming** (`client.messages.stream`) dramatically improves perceived performance for long generations
- **Model recommendation:** `claude-sonnet-4-6` — good balance of speed and code quality for component generation
