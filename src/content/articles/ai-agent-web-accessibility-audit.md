---
title: "How to Build an AI Agent That Audits Your Web Accessibility"
description: "Build an AI-powered accessibility audit agent that combines automated axe-core testing with Claude's reasoning to produce actionable reports and code-level fix suggestions."
slug: "/articles/ai-agent-web-accessibility-audit"
publishOrder: 32
category: "AI Agents"
date: "2025-05-05"
---

# How to Build an AI Agent That Audits Your Web Accessibility

Accessibility auditing traditionally requires either expensive specialist tools, time-consuming manual testing, or both. Automated tools like axe-core catch 30-40% of WCAG issues automatically, but the remainder require human judgment — understanding context, testing with assistive technology, and knowing when a technically valid pattern fails in practice.

An AI accessibility audit agent bridges part of this gap: it runs automated testing, passes the results to Claude for contextual analysis, generates specific fix suggestions at the code level, and produces a structured report that a developer can act on. It doesn't replace manual testing and assistive technology testing, but it dramatically improves the quality and actionability of the automated testing pass.

---

## What the Agent Does

1. Loads a page (or component HTML) in a headless browser
2. Runs axe-core to collect all accessibility violations
3. Extracts the affected HTML from the page
4. Sends violations + HTML context to Claude
5. Claude analyses the violations, explains their impact, suggests specific code fixes
6. Outputs a structured report in Markdown

---

## Setup

```bash
npm install @anthropic-ai/sdk playwright axe-playwright axe-core
```

We use Playwright for headless browser control and `axe-playwright` for the axe-core integration.

---

## Step 1: Running the Automated Audit

```typescript
// audit-runner.ts
import { chromium } from 'playwright';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

interface AxeViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
}

interface AxeNode {
  target: string[];
  html: string;
  failureSummary: string;
  impact: string;
}

async function runAxeAudit(url: string): Promise<{
  violations: AxeViolation[];
  pageTitle: string;
  url: string;
}> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    const pageTitle = await page.title();
    
    // Inject axe-core into the page
    await injectAxe(page);
    
    // Run the audit with WCAG 2.1 AA ruleset
    const violations = await getViolations(page, undefined, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      },
      resultTypes: ['violations'],
    });
    
    return {
      violations: violations as AxeViolation[],
      pageTitle,
      url,
    };
  } finally {
    await browser.close();
  }
}
```

---

## Step 2: Extracting Context for Claude

Raw axe-core output includes the violation rule and the offending HTML snippet. We need to organise this into a format Claude can reason about effectively:

```typescript
interface ViolationContext {
  ruleId: string;
  impact: string;
  description: string;
  wcagCriteria: string;
  helpUrl: string;
  affectedElements: {
    selector: string;
    html: string;
    issue: string;
  }[];
}

function prepareViolationContext(violations: AxeViolation[]): ViolationContext[] {
  return violations.map(violation => ({
    ruleId: violation.id,
    impact: violation.impact,
    description: violation.description,
    wcagCriteria: extractWcagCriteria(violation.helpUrl),
    helpUrl: violation.helpUrl,
    affectedElements: violation.nodes.map(node => ({
      selector: node.target.join(' > '),
      html: node.html.substring(0, 500), // limit HTML snippet length
      issue: node.failureSummary,
    })),
  }));
}

function extractWcagCriteria(helpUrl: string): string {
  // Extract WCAG criterion number from axe help URL
  const match = helpUrl.match(/dequeuniversity\.com\/rules\/axe\/[^/]+\/([^?]+)/);
  return match ? match[1] : 'Unknown';
}
```

---

## Step 3: Claude Analysis and Fix Generation

```typescript
// ai-analyzer.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface AnalysisResult {
  executiveSummary: string;
  criticalCount: number;
  seriousCount: number;
  violations: EnrichedViolation[];
  quickWins: string[];
  estimatedFixTime: string;
}

interface EnrichedViolation {
  ruleId: string;
  impact: string;
  wcagCriteria: string;
  plainLanguageDescription: string;
  userImpact: string;
  fixSuggestions: FixSuggestion[];
}

interface FixSuggestion {
  selector: string;
  currentHtml: string;
  fixedHtml: string;
  explanation: string;
}

async function analyseViolations(
  violations: ViolationContext[],
  pageTitle: string,
  url: string
): Promise<AnalysisResult> {
  
  if (violations.length === 0) {
    return {
      executiveSummary: 'No automated accessibility violations detected. Manual testing with assistive technology is still recommended.',
      criticalCount: 0,
      seriousCount: 0,
      violations: [],
      quickWins: [],
      estimatedFixTime: '0 hours',
    };
  }
  
  const prompt = `You are an accessibility expert analysing automated axe-core audit results for "${pageTitle}" (${url}).

Here are the accessibility violations found:

${JSON.stringify(violations, null, 2)}

Provide a structured analysis in this exact JSON format:
{
  "executiveSummary": "2-3 sentence summary for a non-technical stakeholder",
  "criticalCount": <number of critical violations>,
  "seriousCount": <number of serious violations>,
  "estimatedFixTime": "X-Y hours (rough estimate for a developer)",
  "quickWins": ["list of violations that can be fixed in under 30 minutes each"],
  "violations": [
    {
      "ruleId": "<same as input>",
      "impact": "<same as input>",
      "wcagCriteria": "<same as input>",
      "plainLanguageDescription": "What this violation means in plain English",
      "userImpact": "How this specifically affects users with disabilities",
      "fixSuggestions": [
        {
          "selector": "<CSS selector of affected element>",
          "currentHtml": "<the current broken HTML>",
          "fixedHtml": "<the corrected HTML>",
          "explanation": "Why this fix resolves the violation"
        }
      ]
    }
  ]
}

For fixedHtml, provide the minimal change needed — don't rewrite the entire element, just the specific attributes or content that need to change.
For violations affecting many similar elements (e.g., all images missing alt text), provide one example fix and note how to apply it to all instances.

Output ONLY the JSON object, no other text.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}';
  
  try {
    return JSON.parse(responseText.trim());
  } catch {
    return {
      executiveSummary: `Analysis failed to parse. Raw violations count: ${violations.length}`,
      criticalCount: violations.filter(v => v.impact === 'critical').length,
      seriousCount: violations.filter(v => v.impact === 'serious').length,
      violations: [],
      quickWins: [],
      estimatedFixTime: 'Unknown',
    };
  }
}
```

---

## Step 4: Report Generation

```typescript
// report-generator.ts
import * as fs from 'fs';

function generateMarkdownReport(
  analysis: AnalysisResult,
  pageTitle: string,
  url: string
): string {
  const impactEmoji: Record<string, string> = {
    critical: '🔴',
    serious: '🟠',
    moderate: '🟡',
    minor: '🔵',
  };
  
  const lines: string[] = [
    `# Accessibility Audit Report`,
    ``,
    `**Page:** ${pageTitle}`,
    `**URL:** ${url}`,
    `**Date:** ${new Date().toLocaleDateString('en-AU')}`,
    `**Standard:** WCAG 2.1 Level AA`,
    ``,
    `---`,
    ``,
    `## Summary`,
    ``,
    analysis.executiveSummary,
    ``,
    `| Metric | Count |`,
    `|--------|-------|`,
    `| Critical violations | ${analysis.criticalCount} |`,
    `| Serious violations | ${analysis.seriousCount} |`,
    `| Total violations | ${analysis.violations.length} |`,
    `| Estimated fix time | ${analysis.estimatedFixTime} |`,
    ``,
  ];
  
  if (analysis.quickWins.length > 0) {
    lines.push(`## Quick Wins`, ``);
    lines.push(`These violations can each be fixed in under 30 minutes:`, ``);
    analysis.quickWins.forEach(win => lines.push(`- ${win}`));
    lines.push(``);
  }
  
  lines.push(`## Violations`, ``);
  
  const sorted = [...analysis.violations].sort((a, b) => {
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return (order[a.impact as keyof typeof order] || 4) - 
           (order[b.impact as keyof typeof order] || 4);
  });
  
  for (const violation of sorted) {
    const emoji = impactEmoji[violation.impact] || '⚪';
    lines.push(`### ${emoji} ${violation.ruleId} (${violation.impact.toUpperCase()})`);
    lines.push(``);
    lines.push(`**WCAG:** ${violation.wcagCriteria}`);
    lines.push(``);
    lines.push(`**What it means:** ${violation.plainLanguageDescription}`);
    lines.push(``);
    lines.push(`**User impact:** ${violation.userImpact}`);
    lines.push(``);
    
    if (violation.fixSuggestions.length > 0) {
      lines.push(`**Fix suggestions:**`);
      lines.push(``);
      
      for (const fix of violation.fixSuggestions) {
        lines.push(`Selector: \`${fix.selector}\``);
        lines.push(``);
        lines.push(`Before:`);
        lines.push('```html');
        lines.push(fix.currentHtml);
        lines.push('```');
        lines.push(``);
        lines.push(`After:`);
        lines.push('```html');
        lines.push(fix.fixedHtml);
        lines.push('```');
        lines.push(``);
        lines.push(fix.explanation);
        lines.push(``);
      }
    }
    
    lines.push(`---`);
    lines.push(``);
  }
  
  lines.push(`## Important Notes`);
  lines.push(``);
  lines.push(`This report was generated by automated testing (axe-core) combined with AI analysis (Claude). Automated testing catches approximately 30-40% of WCAG violations.`);
  lines.push(``);
  lines.push(`**Manual testing is required for:**`);
  lines.push(`- Screen reader testing (VoiceOver, NVDA)`);
  lines.push(`- Keyboard-only navigation testing`);
  lines.push(`- Cognitive accessibility evaluation`);
  lines.push(`- Colour contrast under different display conditions`);
  lines.push(`- Complex widget interaction patterns`);
  
  return lines.join('\n');
}
```

---

## Step 5: The CLI

```typescript
// cli.ts
async function main() {
  const url = process.argv[2];
  const outputPath = process.argv[3] || 'accessibility-report.md';
  
  if (!url) {
    console.error('Usage: npx ts-node cli.ts <url> [output-path]');
    process.exit(1);
  }
  
  console.log(`🔍 Running axe-core audit on ${url}...`);
  const { violations, pageTitle } = await runAxeAudit(url);
  console.log(`   Found ${violations.length} violations`);
  
  console.log(`🤖 Analysing violations with Claude...`);
  const violationContexts = prepareViolationContext(violations);
  const analysis = await analyseViolations(violationContexts, pageTitle, url);
  
  console.log(`📄 Generating report...`);
  const report = generateMarkdownReport(analysis, pageTitle, url);
  
  fs.writeFileSync(outputPath, report);
  console.log(`✅ Report saved to ${outputPath}`);
  
  // Summary
  console.log(`\n${analysis.criticalCount} critical, ${analysis.seriousCount} serious violations`);
  console.log(`Estimated fix time: ${analysis.estimatedFixTime}`);
  
  if (analysis.criticalCount > 0) process.exit(1);
}

main().catch(console.error);
```

---

## Integrating with CI

```yaml
# .github/workflows/accessibility.yml
name: Accessibility Audit

on:
  pull_request:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - run: npm ci
      - run: npx playwright install chromium
      
      - name: Start dev server
        run: npm run dev &
      - run: sleep 10 # wait for server
      
      - name: Run accessibility audit
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: npx ts-node cli.ts http://localhost:3000 report.md
      
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: report.md
```

---

## Conclusion

An AI-powered accessibility audit agent produces significantly more actionable output than axe-core alone. The automated violations tell you what's wrong; Claude's analysis explains why it matters, who is affected, and exactly how to fix it at the code level.

The key caveat: this catches ~30-40% of WCAG issues — the same as any automated tool. The AI layer makes those findings more actionable, but manual testing with real assistive technology remains the only way to achieve comprehensive coverage.

---

## TL;DR

- **Pipeline:** Playwright (headless browser) → axe-core violations → Claude analysis → Markdown report
- **axe-core ruleset:** `wcag2a`, `wcag2aa`, `wcag21aa` — covers WCAG 2.1 AA automated checks
- **Claude's role:** plain-language explanations, user impact assessment, specific HTML fix suggestions
- **Report includes:** executive summary, violation counts, quick wins, code-level before/after fixes
- **CI integration:** runs on PRs, uploads report as artifact, exits with error on critical violations
- **Honest limitation:** automated testing catches 30-40% of WCAG issues — always combine with manual and assistive technology testing
