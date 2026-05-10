---
title: "Creating a Design-to-Code Pipeline with AI Agents"
description: "Build an automated pipeline that takes Figma design data and generates React component code using AI agents — covering architecture, Figma API integration, Claude prompt design, and validation."
slug: "/articles/design-to-code-ai-agent-pipeline"
publishOrder: 30
category: "AI Agents"
date: "2025-05-05"
---

# Creating a Design-to-Code Pipeline with AI Agents

The design-to-code handoff is one of the most friction-heavy parts of product development. A designer produces a Figma file; a developer interprets it and writes code. The interpretation step involves translating visual information into semantic structure, choosing the right CSS approach, handling responsive behaviour, and making hundreds of small decisions that aren't explicit in the design.

An AI agent pipeline can automate a significant portion of this — not to replace the developer's judgment, but to produce a first draft that handles the mechanical translation while leaving the important decisions for human review.

This article builds a design-to-code pipeline: Figma API → component structure extraction → Claude API for code generation → output for developer review.

---

## Architecture Overview

```
Figma File
    ↓
Figma REST API (extract component structure)
    ↓
Structure normalisation (clean up the data)
    ↓
Claude API (generate React component code)
    ↓
Output files (for developer review and refinement)
```

The pipeline is deliberately not fully automated — it produces output for human review, not code that goes directly to production. The agent handles the mechanical translation; the developer handles the judgment calls.

---

## Step 1: Figma API Access

Get your Figma API credentials:
- Personal access token: Figma → Account Settings → Personal access tokens
- File key: from the Figma file URL (`figma.com/file/[FILE_KEY]/...`)

```bash
npm install node-fetch
```

```typescript
// figma-client.ts
const FIGMA_TOKEN = process.env.FIGMA_TOKEN;

async function getFigmaFile(fileKey: string) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN! } }
  );
  return response.json();
}

async function getFigmaNode(fileKey: string, nodeId: string) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN! } }
  );
  return response.json();
}

async function exportFigmaNodeAsImage(fileKey: string, nodeId: string): Promise<string> {
  const response = await fetch(
    `https://api.figma.com/v1/images/${fileKey}?ids=${nodeId}&format=png&scale=2`,
    { headers: { 'X-Figma-Token': FIGMA_TOKEN! } }
  );
  const data = await response.json();
  return data.images[nodeId];
}
```

---

## Step 2: Extracting Component Structure

The Figma API returns a deep node tree. We need to extract the information relevant to code generation:

```typescript
// extract-structure.ts

interface ComponentStructure {
  name: string;
  type: string;
  width?: number;
  height?: number;
  fills?: Fill[];
  strokes?: Stroke[];
  cornerRadius?: number;
  padding?: Padding;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  itemSpacing?: number;
  children?: ComponentStructure[];
  text?: string;
  fontSize?: number;
  fontWeight?: number;
  opacity?: number;
  constraints?: Constraints;
}

interface Fill {
  type: string;
  color?: { r: number; g: number; b: number; a: number };
  opacity?: number;
}

function extractStructure(node: any): ComponentStructure {
  const structure: ComponentStructure = {
    name: node.name,
    type: node.type,
  };

  // Dimensions
  if (node.absoluteBoundingBox) {
    structure.width = Math.round(node.absoluteBoundingBox.width);
    structure.height = Math.round(node.absoluteBoundingBox.height);
  }

  // Fills
  if (node.fills?.length > 0) {
    structure.fills = node.fills.map((fill: any) => ({
      type: fill.type,
      color: fill.color ? rgbaToHex(fill.color) : undefined,
      opacity: fill.opacity,
    }));
  }

  // Corner radius
  if (node.cornerRadius) {
    structure.cornerRadius = node.cornerRadius;
  }

  // Auto layout
  if (node.layoutMode && node.layoutMode !== 'NONE') {
    structure.layoutMode = node.layoutMode;
    structure.itemSpacing = node.itemSpacing;
    structure.padding = {
      top: node.paddingTop || 0,
      right: node.paddingRight || 0,
      bottom: node.paddingBottom || 0,
      left: node.paddingLeft || 0,
    };
  }

  // Text content
  if (node.type === 'TEXT') {
    structure.text = node.characters;
    structure.fontSize = node.style?.fontSize;
    structure.fontWeight = node.style?.fontWeight;
  }

  // Children
  if (node.children?.length > 0) {
    structure.children = node.children.map(extractStructure);
  }

  return structure;
}

function rgbaToHex(color: { r: number; g: number; b: number; a: number }): string {
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}
```

---

## Step 3: Claude API Code Generation

With the component structure extracted, pass it to Claude for code generation. The prompt is critical — it needs to produce specific, consistent output:

```typescript
// generate-component.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

async function generateComponent(
  structure: ComponentStructure,
  imageUrl?: string,
  projectContext?: string
): Promise<string> {
  
  const content: Anthropic.MessageParam['content'] = [];
  
  // Add the component structure as context
  content.push({
    type: 'text',
    text: buildGenerationPrompt(structure, projectContext),
  });
  
  // If we have a screenshot, include it for visual reference
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: base64,
      },
    });
    
    content.push({
      type: 'text',
      text: 'The image above shows the visual design to implement. Use it to inform your implementation alongside the structure data.',
    });
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  
  // Extract code from response
  const codeMatch = responseText.match(/```(?:tsx|jsx)?\n([\s\S]*?)```/);
  return codeMatch ? codeMatch[1].trim() : responseText;
}

function buildGenerationPrompt(structure: ComponentStructure, projectContext?: string): string {
  return `Generate a React component from this Figma component structure.

Component structure (JSON):
${JSON.stringify(structure, null, 2)}

${projectContext ? `Project context:\n${projectContext}\n` : ''}

Requirements:
- TypeScript with properly typed props interface
- Tailwind CSS for styling
- Semantic, accessible HTML
- Named after the Figma component: ${toPascalCase(structure.name)}
- All text content as props where it could reasonably vary
- Hardcode colours that are clearly brand/design system values
- Default export

Output ONLY the component code in a tsx code block. No explanations.`;
}

function toPascalCase(str: string): string {
  return str.replace(/(?:^|[\s-_/])(\w)/g, (_, c) => c.toUpperCase()).replace(/[\s-_/]/g, '');
}
```

---

## Step 4: The Pipeline Orchestrator

```typescript
// pipeline.ts
import * as fs from 'fs';
import * as path from 'path';

interface PipelineOptions {
  fileKey: string;
  nodeId: string;
  outputDir: string;
  projectContext?: string;
  includeScreenshot?: boolean;
}

async function runPipeline(options: PipelineOptions) {
  const { fileKey, nodeId, outputDir } = options;
  
  console.log('1. Fetching Figma component...');
  const figmaData = await getFigmaNode(fileKey, nodeId);
  const node = figmaData.nodes[nodeId].document;
  
  console.log('2. Extracting structure...');
  const structure = extractStructure(node);
  
  let imageUrl: string | undefined;
  if (options.includeScreenshot) {
    console.log('3. Exporting component image...');
    imageUrl = await exportFigmaNodeAsImage(fileKey, nodeId);
  }
  
  console.log('4. Generating component code...');
  const code = await generateComponent(structure, imageUrl, options.projectContext);
  
  // Write output files
  fs.mkdirSync(outputDir, { recursive: true });
  
  const componentName = toPascalCase(structure.name);
  
  // Generated component
  fs.writeFileSync(
    path.join(outputDir, `${componentName}.tsx`),
    code
  );
  
  // Structure JSON (useful for debugging and iteration)
  fs.writeFileSync(
    path.join(outputDir, `${componentName}.structure.json`),
    JSON.stringify(structure, null, 2)
  );
  
  console.log(`✅ Component generated: ${outputDir}/${componentName}.tsx`);
  console.log('Review the generated code before using in production.');
}
```

---

## What the Pipeline Gets Right (and Wrong)

After running this pipeline on dozens of Figma components, here's an honest assessment of where AI output is useful versus where it needs significant rework:

### Reliable outputs
- Component structure and prop interface — usually correct and well-typed
- Static layout using Flexbox/Grid — generally accurate for simple components
- Text content extracted as props — consistent pattern
- Colour values — translated accurately from Figma fills

### Needs review
- Responsive behaviour — Figma designs don't encode breakpoints; the agent makes assumptions that need checking
- Interactive states (hover, focus, disabled) — typically generates reasonable patterns but misses component-specific details
- Complex spacing — Figma's auto layout maps imperfectly to CSS

### Needs rewriting
- Complex animations — the agent can't generate what isn't in the static design
- Business logic in interactive components — forms, data tables, anything with state
- Figma components using design system variants — the agent doesn't know your design system

---

## Validation Step

Before outputting, add a simple validation step to catch obviously broken output:

```typescript
function validateGeneratedCode(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!code.includes('export default')) {
    issues.push('Missing default export');
  }
  
  if (!code.includes('interface') && !code.includes('type ')) {
    issues.push('Missing TypeScript types');
  }
  
  // Basic JSX check
  if (!code.includes('return (') && !code.includes('return <')) {
    issues.push('Missing return statement with JSX');
  }
  
  // Unmatched brackets (rough check)
  const openBrackets = (code.match(/\(/g) || []).length;
  const closeBrackets = (code.match(/\)/g) || []).length;
  if (Math.abs(openBrackets - closeBrackets) > 2) {
    issues.push('Possible unmatched parentheses');
  }
  
  return { valid: issues.length === 0, issues };
}
```

If validation fails, retry generation with a note about what went wrong. Limit retries to 2-3 to avoid runaway API usage.

---

## Conclusion

A design-to-code pipeline using the Figma API and Claude can compress the mechanical portion of design implementation significantly. The structured component data from Figma, combined with Claude's ability to generate typed React code, handles the translation work that's most tedious for developers.

The pipeline is most valuable as a starting point generator, not an autonomous coder. The 30-40% of work that involves judgment — responsive behaviour, interaction states, accessibility, integration with your component library — remains a human responsibility.

---

## TL;DR

- **Pipeline:** Figma API → extract structure → Claude API (+ optional screenshot) → output files for review
- **Figma API:** personal access token + file key; extract node data with `/v1/files/{key}/nodes`
- **Structure extraction:** normalise the deep Figma node tree into a clean JSON structure Claude can reason about
- **Prompt design:** provide structure JSON + optional screenshot image; require specific TypeScript/Tailwind output format
- **What it gets right:** component structure, prop types, static layout, text as props, colours
- **What needs human review:** responsive behaviour, interactive states, complex animations, business logic
- **Always validate:** check for default export, TypeScript types, basic JSX structure before writing files
