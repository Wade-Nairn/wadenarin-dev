---
title: "Optimising Core Web Vitals: LCP, CLS and INP in Production"
description: "A practical guide to improving Core Web Vitals scores on real websites — diagnosing LCP, CLS, and INP issues, fixing them, and measuring the results."
slug: "/articles/optimising-core-web-vitals-lcp-cls-inp"
publishOrder: 10
category: "Technical"
date: "2025-05-05"
---

# Optimising Core Web Vitals: LCP, CLS and INP in Production

Core Web Vitals are Google's set of performance metrics that directly influence search ranking. Most frontend developers know what they are. Far fewer have actually gone through the process of diagnosing and fixing real Core Web Vitals failures on production sites — which is a different and considerably more challenging exercise than knowing the definitions.

This guide is about the latter: practical diagnosis and remediation of LCP, CLS, and INP issues on real sites. We'll look at what causes poor scores, how to find the specific culprits on your site, and the fixes that actually move the needle.

---

## The Three Metrics and What They Measure

**Largest Contentful Paint (LCP)** measures when the largest content element in the viewport becomes visible. For most sites, this is a hero image or a large text block. Google's threshold: good is under 2.5 seconds, poor is over 4 seconds.

**Cumulative Layout Shift (CLS)** measures visual instability — how much page elements move around during loading. The score is a unitless number: good is under 0.1, poor is over 0.25. Even small layout shifts that happen repeatedly can accumulate to a poor score.

**Interaction to Next Paint (INP)** replaced First Input Delay (FID) in March 2024. It measures the latency of all user interactions with the page — clicks, keyboard input, taps — and reports the worst case. Good is under 200ms, poor is over 500ms.

---

## Diagnosing Your Current Scores

Before optimising, you need accurate data. Three tools are worth knowing:

**PageSpeed Insights** (pagespeed.web.dev) shows both lab data (from Lighthouse) and field data (from real Chrome users via the Chrome User Experience Report). Field data is what Google uses for ranking. If your field data and lab data diverge significantly, investigate why — it often points to specific user conditions (slow networks, older devices) that lab tests don't replicate.

**Chrome DevTools** — the Performance panel records a page load and shows you exactly when each element renders, when layout shifts occur, and what's blocking interactivity. This is where you diagnose the specific causes once you know there's a problem.

**web-vitals JavaScript library** lets you measure Core Web Vitals from real user sessions and send them to your analytics. This gives you field data with your own context — tied to specific pages, user segments, or device types.

---

## Fixing LCP

LCP is almost always either a resource loading problem or a render-blocking problem.

### Eliminate render-blocking resources

If your LCP element is a hero image, but the browser can't start loading it until CSS and JavaScript have downloaded and executed, your LCP will suffer. Check your page's critical rendering path:

- Move non-critical CSS to be loaded asynchronously
- Defer or async non-critical JavaScript
- Inline critical CSS (the styles needed to render above-the-fold content) directly in the `<head>`

### Preload the LCP image

If you know what the LCP element is (usually the hero image), tell the browser to start loading it immediately:

```html
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
```

The `fetchpriority="high"` attribute (also settable as `fetchPriority` in React) tells the browser this is the most important resource on the page. This is one of the highest-impact single changes for LCP on image-heavy sites.

### Use modern image formats

WebP and AVIF images are significantly smaller than JPEG at the same quality level. Smaller images load faster, directly improving LCP.

```html
<picture>
  <source srcset="/hero.avif" type="image/avif">
  <source srcset="/hero.webp" type="image/webp">
  <img src="/hero.jpg" alt="Hero image" width="1200" height="600">
</picture>
```

Always include `width` and `height` attributes — these help prevent CLS.

### Serve from a CDN

If your LCP image (or any large resource) is served from a slow origin server, no amount of optimisation will fully compensate. Serve static assets from a CDN with edge locations close to your users. For Australian sites targeting Australian users, a CDN with Australian PoPs (Cloudflare, Fastly, AWS CloudFront) is important.

### Check server response time

A slow Time to First Byte (TTFB) delays everything, including LCP. A TTFB over 600ms is a red flag. Check your server response times, consider adding caching at the CDN layer, and if you're on shared hosting, consider whether your server infrastructure matches your traffic levels.

---

## Fixing CLS

Layout shift happens when elements move after they've been painted. The causes fall into a small set of common patterns.

### Always set image dimensions

Images without explicit `width` and `height` attributes cause layout shifts because the browser doesn't know how much space to reserve before the image loads.

```jsx
// Bad — no dimensions
<img src="/product.jpg" alt="Product" />

// Good — explicit dimensions
<img src="/product.jpg" alt="Product" width="800" height="600" />

// Good — with CSS aspect ratio
<img src="/product.jpg" alt="Product" style={{ aspectRatio: '4/3', width: '100%' }} />
```

### Reserve space for dynamic content

Ad slots, embeds, and dynamically loaded content are common CLS sources. Reserve the space they'll occupy before they load:

```css
.ad-slot {
  min-height: 250px; /* Reserve space for the ad */
  width: 300px;
}
```

### Avoid inserting content above existing content

Banners, cookie notices, and notifications that appear at the top of the page and push content down are major CLS contributors. Solutions:

- Pre-allocate space for banners that will appear (even if empty initially)
- Use `position: fixed` or `position: sticky` for elements that should appear without affecting layout flow
- Delay non-urgent banners until after the page has stabilised (after LCP)

### Be careful with web fonts

Custom fonts can cause layout shift if the fallback font has different dimensions than the loaded font. Use `font-display: optional` to prevent invisible text or `font-display: swap` to show fallback text immediately. Better yet, use the `size-adjust` CSS descriptor to make your fallback font match the dimensions of your custom font:

```css
@font-face {
  font-family: 'FallbackFont';
  src: local('Arial');
  size-adjust: 105%;
  ascent-override: 90%;
}
```

---

## Fixing INP

INP is the newest metric and often the most misunderstood. Poor INP means your page feels sluggish when users interact with it — buttons take a noticeable moment to respond, typing into inputs feels slow.

### Find long tasks

The biggest cause of poor INP is long JavaScript tasks that block the main thread. In Chrome DevTools > Performance, record an interaction and look for tasks taking longer than 50ms (shown in red). These are the tasks you need to break up.

### Break up long tasks

Long synchronous JavaScript blocks the browser from responding to user input. Break long tasks into smaller chunks using `scheduler.yield()` or `setTimeout`:

```javascript
// Instead of one long synchronous operation:
function processLargeDataset(items) {
  items.forEach(item => expensiveOperation(item));
}

// Break it up to yield to the browser:
async function processLargeDataset(items) {
  for (const item of items) {
    expensiveOperation(item);
    await scheduler.yield(); // yields to browser between items
  }
}
```

### Debounce and throttle expensive event handlers

Input handlers, scroll handlers, and resize handlers that trigger expensive operations are common INP culprits:

```javascript
import { useDeferredValue } from 'react';

function SearchInput() {
  const [value, setValue] = useState('');
  const deferredValue = useDeferredValue(value);
  
  // Use deferredValue for the expensive filtered results
  // Use value for the input itself so it responds immediately
}
```

### Avoid large DOM sizes

Browsers slow down significantly when the DOM exceeds ~1,500 nodes. Virtualise long lists with libraries like `react-virtual` or `tanstack-virtual` so only the visible items are in the DOM.

---

## Measuring After Optimisation

After making changes, don't rely solely on lab tests. Deploy to a staging environment and use the web-vitals library to measure against real traffic conditions. Field data from real users — particularly on mobile and slower connections — is what will ultimately determine your ranking impact.

Give changes at least 28 days in production before assessing their impact on field data. Core Web Vitals field data in PageSpeed Insights uses a 28-day rolling window.

---

## Conclusion

Core Web Vitals optimisation is a diagnosis-first discipline. The tools (PageSpeed Insights, Chrome DevTools, web-vitals library) will tell you what's wrong; the patterns above tell you how to fix it. Most sites have 2–3 high-impact issues that account for the majority of their score problems — find those first before doing broad optimisation work.

---

## TL;DR

- **LCP:** preload the hero image with `fetchpriority="high"`, use WebP/AVIF, serve from a CDN with Australian PoPs, inline critical CSS
- **CLS:** always set image dimensions, reserve space for dynamic content, fix web font size mismatches, never insert content above existing content
- **INP:** break up long JavaScript tasks, debounce expensive handlers, virtualise long lists, reduce DOM size
- **Diagnose with:** PageSpeed Insights field data (not just lab), Chrome DevTools Performance panel, web-vitals library in production
- **Measure impact:** wait 28 days after deploying fixes for field data to reflect changes
- Fix the 2–3 biggest issues first — they drive the majority of the score
