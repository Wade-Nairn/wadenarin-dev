---
title: "How to Build a Frontend Code Review Agent from Scratch"
description: "Build an AI-powered code review agent that analyses React and TypeScript code for issues, suggests improvements, and integrates with your GitHub pull request workflow."
slug: "/articles/frontend-code-review-agent-claude"
publishOrder: 28
category: "AI Agents"
date: "2025-05-05"
---

# How to Build a Frontend Code Review Agent from Scratch

A code review agent reads your code and provides structured feedback — not as a linter catching syntax errors, but as a thoughtful reviewer flagging potential bugs, suggesting improvements, and noting patterns that don't match your codebase's conventions.

This article builds a working frontend code review agent: a Node.js script that takes a file or diff as input, calls the Claude API with a structured review prompt, and produces actionable feedback. We'll then look at integrating this into a GitHub Actions workflow so it runs automatically on pull requests.

---

## What the Agent Reviews

The agent is most useful for things that linters and type checkers can't catch:

- Logic that's technically correct but potentially buggy (off-by-one errors, race conditions, incorrect dependency arrays)
- Performance issues (unnecessary re-renders, expensive operations in render, missing memoisation)
- Accessibility oversights (missing ARIA attributes, incorrect keyboard behaviour)
- Code that doesn't match established patterns in the codebase
- Security concerns (unescaped user input, hardcoded sensitive values)
- Missing edge case handling

---

## Setup

```bash
mkdir code-review-agent
cd code-review-agent
npm init -y
npm install @anthropic-ai/sdk
```

Create a `.env` file (or use your CI's secret management):

```
ANTHROPIC_API_KEY=your-api-key
```

---

## The Core Review Function

```typescript
// review.ts
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ReviewOptions {
  filePath?: string;
  code?: string;
  context?: string;
  language?: string;
}

interface ReviewResult {
  summary: string;
  issues: Issue[];
  suggestions: Suggestion[];
  positives: string[];
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  description: string;
  suggestion: string;
}

interface Suggestion {
  description: string;
  before?: string;
  after?: string;
}

async function reviewCode(options: ReviewOptions): Promise<ReviewResult> {
  const code = options.code || fs.readFileSync(options.filePath!, 'utf-8');
  const language = options.language || detectLanguage(options.filePath);
  
  const prompt = buildReviewPrompt(code, language, options.context);
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = message.content[0].type === 'text' 
    ? message.content[0].text 
    : '';
    
  return parseReviewResponse(responseText);
}

function detectLanguage(filePath?: string): string {
  if (!filePath) return 'typescript';
  if (filePath.endsWith('.tsx')) return 'tsx';
  if (filePath.endsWith('.ts')) return 'typescript';
  if (filePath.endsWith('.jsx')) return 'jsx';
  if (filePath.endsWith('.js')) return 'javascript';
  if (filePath.endsWith('.css')) return 'css';
  return 'typescript';
}
```

---

## The Review Prompt

The prompt is the most important part. It defines what the agent looks for and how it structures its output:

```typescript
function buildReviewPrompt(code: string, language: string, context?: string): string {
  return `You are an expert frontend developer conducting a code review. Review the following ${language} code and provide structured feedback.

${context ? `Context: ${context}\n\n` : ''}Code to review:
\`\`\`${language}
${code}
\`\`\`

Provide your review as a JSON object with this exact structure:
{
  "summary": "2-3 sentence overall assessment",
  "issues": [
    {
      "severity": "error|warning|info",
      "line": <line number if applicable, null otherwise>,
      "description": "what the issue is",
      "suggestion": "how to fix it"
    }
  ],
  "suggestions": [
    {
      "description": "improvement suggestion",
      "before": "code snippet showing current approach (optional)",
      "after": "code snippet showing improved approach (optional)"
    }
  ],
  "positives": ["things done well in this code"]
}

Focus on:
- Correctness: bugs, logic errors, incorrect React patterns (stale closures, missing dependencies, incorrect hook usage)
- Performance: unnecessary re-renders, expensive computations in render, missing memoisation where it would help
- Accessibility: missing ARIA attributes, keyboard navigation issues, incorrect semantic HTML
- Security: unescaped user input, exposed sensitive data, insecure patterns
- Maintainability: overly complex logic, missing error handling, unclear variable names
- TypeScript: incorrect types, excessive use of 'any', missing type narrowing

Severity guide:
- error: likely causes bugs or breaks functionality
- warning: may cause issues, should be addressed
- info: suggestions for improvement, not blocking

Output ONLY the JSON object, no other text.`;
}
```

The "output ONLY the JSON object" instruction is important — it ensures the response is directly parseable without stripping text.

---

## Parsing the Response

```typescript
function parseReviewResponse(text: string): ReviewResult {
  try {
    // Extract JSON if it's wrapped in code blocks
    const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || [null, text];
    const jsonString = jsonMatch[1] || text;
    
    const parsed = JSON.parse(jsonString.trim());
    
    return {
      summary: parsed.summary || '',
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      positives: Array.isArray(parsed.positives) ? parsed.positives : [],
    };
  } catch (error) {
    // Fallback if JSON parsing fails
    return {
      summary: text,
      issues: [],
      suggestions: [],
      positives: [],
    };
  }
}
```

---

## Formatting the Output

```typescript
function formatReviewMarkdown(review: ReviewResult, filename?: string): string {
  const lines: string[] = [];
  
  if (filename) {
    lines.push(`## Code Review: \`${filename}\``);
    lines.push('');
  }
  
  lines.push(`**Summary:** ${review.summary}`);
  lines.push('');
  
  if (review.issues.length > 0) {
    lines.push('### Issues');
    lines.push('');
    
    const errors = review.issues.filter(i => i.severity === 'error');
    const warnings = review.issues.filter(i => i.severity === 'warning');
    const infos = review.issues.filter(i => i.severity === 'info');
    
    for (const issue of [...errors, ...warnings, ...infos]) {
      const emoji = { error: '🔴', warning: '🟡', info: '🔵' }[issue.severity];
      const lineRef = issue.line ? ` (line ${issue.line})` : '';
      lines.push(`${emoji} **${issue.severity.toUpperCase()}**${lineRef}: ${issue.description}`);
      lines.push(`   → ${issue.suggestion}`);
      lines.push('');
    }
  }
  
  if (review.suggestions.length > 0) {
    lines.push('### Suggestions');
    lines.push('');
    review.suggestions.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.description}`);
      if (s.before && s.after) {
        lines.push('');
        lines.push('   Before:');
        lines.push('   ```');
        lines.push(`   ${s.before}`);
        lines.push('   ```');
        lines.push('   After:');
        lines.push('   ```');
        lines.push(`   ${s.after}`);
        lines.push('   ```');
      }
      lines.push('');
    });
  }
  
  if (review.positives.length > 0) {
    lines.push('### What\'s working well');
    lines.push('');
    review.positives.forEach(p => lines.push(`✅ ${p}`));
  }
  
  return lines.join('\n');
}
```

---

## CLI Usage

```typescript
// cli.ts
async function main() {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: npx ts-node cli.ts <file-path>');
    process.exit(1);
  }
  
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  
  console.log(`Reviewing ${filePath}...`);
  
  const review = await reviewCode({ filePath });
  const markdown = formatReviewMarkdown(review, filePath);
  
  console.log(markdown);
  
  // Exit with error code if there are errors (useful for CI)
  const hasErrors = review.issues.some(i => i.severity === 'error');
  process.exit(hasErrors ? 1 : 0);
}

main().catch(console.error);
```

---

## GitHub Actions Integration

The most useful deployment: run the agent automatically on pull requests, posting the review as a PR comment.

```yaml
# .github/workflows/code-review.yml
name: AI Code Review

on:
  pull_request:
    paths:
      - 'src/**/*.tsx'
      - 'src/**/*.ts'
      - 'src/**/*.jsx'
      - 'src/**/*.js'

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      
      - name: Get changed files
        id: changed-files
        run: |
          echo "files=$(git diff --name-only origin/${{ github.base_ref }}...HEAD -- 'src/**/*.tsx' 'src/**/*.ts' | head -10 | tr '\n' ' ')" >> $GITHUB_OUTPUT
      
      - name: Run AI code review
        id: review
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          REVIEW_OUTPUT=""
          for file in ${{ steps.changed-files.outputs.files }}; do
            if [ -f "$file" ]; then
              REVIEW=$(npx ts-node review-cli.ts "$file" 2>/dev/null || echo "Review failed for $file")
              REVIEW_OUTPUT="$REVIEW_OUTPUT\n$REVIEW\n---\n"
            fi
          done
          echo "review<<EOF" >> $GITHUB_OUTPUT
          echo -e "$REVIEW_OUTPUT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT
      
      - name: Post review comment
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🤖 AI Code Review\n\n${{ steps.review.outputs.review }}\n\n*Reviewed by Claude code review agent — treat as a starting point, not a final verdict.*`
            });
```

---

## Keeping It Useful

A few practices that make the agent more useful in a real team:

**Limit files per review.** The GitHub Action above caps at 10 changed files (`head -10`). Reviewing 50 files in one PR produces a wall of text no one reads.

**Be clear it's a starting point.** The "treat as a starting point, not a final verdict" note in the comment is important. Code review agents should support human review, not replace it.

**Tune the prompt for your codebase.** Add specific patterns from your codebase's conventions to the prompt. "This codebase uses Zustand for state management — flag any use of Context for non-theme/locale state."

---

## TL;DR

- **Core:** Anthropic SDK + structured JSON prompt → parse response → format markdown
- **Prompt engineering:** explicit JSON output format, severity levels, specific areas to focus (correctness, performance, accessibility, security)
- **CLI:** `ts-node review-cli.ts <file>` for local use; exit code 1 on errors for CI integration
- **GitHub Actions:** trigger on PR, get changed files, run agent per file, post comment
- **Model:** `claude-sonnet-4-6` — good balance of speed and review quality
- **Keep it useful:** limit files per review, frame as supporting human review not replacing it, tune prompt for your codebase conventions
