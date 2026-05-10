---
title: "React Server Components Explained: When and Why to Use Them"
description: "A clear explanation of React Server Components — what problem they solve, how they differ from client components, when to use each, and the common mistakes to avoid."
slug: "/articles/react-server-components-explained"
publishOrder: 27
category: "Technical"
date: "2025-05-05"
---

# React Server Components Explained: When and Why to Use Them

React Server Components (RSC) landed in the React ecosystem with significant fanfare and, for many developers, significant confusion. The mental model requires a genuine shift from how React has worked for a decade, and the concepts are easy to misunderstand in ways that lead to bugs or performance regressions.

This article explains what Server Components actually are, what problem they solve, how the client/server boundary works in practice, and the rules you need to follow to use them correctly.

---

## The Problem RSC Solves

Before RSC, a typical React application worked like this:

1. The server sends an HTML shell and a JavaScript bundle
2. The browser downloads and parses the JavaScript
3. React "hydrates" the page — attaching event listeners and making it interactive
4. Components fetch data they need (usually in `useEffect` or via a data-fetching library)
5. Loading states show while data is fetching
6. Components re-render with the fetched data

The problem: everything is JavaScript. Even components that never change (a blog post, a product description, a navigation menu) ship their rendering logic to the browser as JavaScript, require hydration, and add to the JavaScript bundle size.

React Server Components solve this by letting you designate certain components as "server only" — they render on the server, their output (serialised JSX) is sent to the client, and no JavaScript for them is ever sent to the browser. They can fetch data directly, can access the file system and databases, and are never hydrated.

---

## Server Components vs Client Components

| | Server Components | Client Components |
|---|---|---|
| Where they render | Server only | Server (initial render) + Client (hydration, updates) |
| Can use hooks | ❌ No | ✅ Yes |
| Can handle events | ❌ No | ✅ Yes |
| Can access server resources | ✅ Yes | ❌ No |
| Add to JS bundle | ❌ No | ✅ Yes |
| Can be async | ✅ Yes | ❌ No (without workarounds) |

**Server Components** (the default in Next.js App Router) can:
- Be `async` functions that `await` data directly
- Import server-only libraries (database clients, file system access)
- Pass data to Client Components as props

**Client Components** (marked with `'use client'` at the top) can:
- Use React hooks (`useState`, `useEffect`, `useCallback`, etc.)
- Handle user events (`onClick`, `onChange`, etc.)
- Access browser APIs (`window`, `localStorage`, etc.)

---

## How the Boundary Works

The `'use client'` directive marks a boundary. Everything below that boundary (the component and everything it imports) is treated as a Client Component.

```tsx
// This is a Server Component (no directive needed)
async function ProductPage({ id }: { id: string }) {
  // Direct async data fetching — no useEffect, no loading state
  const product = await db.products.findById(id);
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      {/* Pass data to a Client Component that needs interactivity */}
      <AddToCartButton productId={product.id} price={product.price} />
    </div>
  );
}
```

```tsx
'use client';

// This is a Client Component
function AddToCartButton({ productId, price }: { productId: string; price: number }) {
  const [isAdding, setIsAdding] = useState(false);
  
  async function handleAddToCart() {
    setIsAdding(true);
    await addToCart(productId);
    setIsAdding(false);
  }
  
  return (
    <button onClick={handleAddToCart} disabled={isAdding}>
      {isAdding ? 'Adding...' : `Add to cart — $${price}`}
    </button>
  );
}
```

The key rule: **Server Components can render Client Components, but Client Components cannot render Server Components.** Once you cross the `'use client'` boundary, you're in client territory.

---

## The `children` Pattern for Composition

What happens when you need a Server Component inside a Client Component? Use the `children` prop:

```tsx
'use client';

// Client Component — handles the UI state
function Modal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  
  return isOpen ? (
    <div className="modal">
      {children} {/* children can be a Server Component */}
      <button onClick={() => setIsOpen(false)}>Close</button>
    </div>
  ) : null;
}
```

```tsx
// Server Component
async function ProductModal({ productId }: { productId: string }) {
  const product = await db.products.findById(productId);
  
  return (
    <Modal>
      {/* This Server Component content is passed as children */}
      <ProductDetails product={product} />
    </Modal>
  );
}
```

The `children` are rendered on the server and passed as already-rendered output to the Client Component. The Client Component doesn't render the children — it just positions them.

---

## Async Data Fetching in Server Components

Server Components can be `async` functions that directly `await` data. No `useEffect`, no loading states, no data-fetching library required:

```tsx
async function UserDashboard({ userId }: { userId: string }) {
  // These fetches happen in parallel (not waterfall)
  const [user, posts, stats] = await Promise.all([
    db.users.findById(userId),
    db.posts.findByAuthor(userId),
    db.analytics.getUserStats(userId),
  ]);
  
  return (
    <div>
      <UserHeader user={user} />
      <StatsPanel stats={stats} />
      <PostList posts={posts} />
    </div>
  );
}
```

`Promise.all` is important here — sequential `await` calls would fetch data in series (waterfall), while `Promise.all` fetches in parallel.

---

## Streaming with Suspense

Long-running data fetches block the entire page from rendering. Suspense lets you stream parts of the page as they become ready:

```tsx
import { Suspense } from 'react';

async function Dashboard({ userId }: { userId: string }) {
  // Fast data — renders immediately
  const user = await db.users.findById(userId);
  
  return (
    <div>
      <UserHeader user={user} />
      
      {/* Slow data — doesn't block the page */}
      <Suspense fallback={<StatsSkeleton />}>
        <SlowStats userId={userId} />
      </Suspense>
      
      <Suspense fallback={<PostListSkeleton />}>
        <RecentPosts userId={userId} />
      </Suspense>
    </div>
  );
}

async function SlowStats({ userId }: { userId: string }) {
  // This slow fetch doesn't block UserHeader from rendering
  const stats = await db.analytics.getExpensiveStats(userId);
  return <StatsPanel stats={stats} />;
}
```

The browser renders `UserHeader` immediately, shows skeletons for `SlowStats` and `RecentPosts`, then streams in the real content as each fetch completes.

---

## Common Mistakes

### Mistake 1: Passing non-serialisable props from Server to Client

Data passed from Server Components to Client Components must be serialisable (JSON-safe). Functions, class instances, and other non-serialisable values can't cross the boundary.

```tsx
// ❌ Error — function can't be serialised
<ClientComponent onClick={handleClick} />

// ✅ Correct — move the onClick handler into the Client Component
<ClientComponent productId={product.id} />
```

### Mistake 2: Using `'use client'` too broadly

Adding `'use client'` to a component that imports many sub-components pushes all of them to the client bundle, even if most don't need interactivity.

Prefer small, focused Client Components that handle the interactive parts, with Server Components handling the surrounding layout and data.

### Mistake 3: Using `useEffect` for data fetching in Server Component contexts

`useEffect` doesn't run on the server. If you're in a Server Component context, fetch data directly as `async/await`. `useEffect` is for Client Components only.

### Mistake 4: Accessing `window` or `document` in shared code

Code imported by Server Components runs on the server, where `window` and `document` don't exist. Check `typeof window !== 'undefined'` before using browser APIs in code that might be imported server-side.

---

## When to Use Server vs Client Components

**Default to Server Components.** In Next.js App Router, all components are Server Components by default. Add `'use client'` only when you need interactivity, hooks, or browser APIs.

**Use Client Components for:**
- Event handlers (onClick, onChange, onSubmit)
- State management (useState, useReducer)
- Side effects (useEffect)
- Browser APIs (localStorage, navigator, window)
- Third-party libraries that use hooks

**Use Server Components for:**
- Data fetching
- Accessing databases, file system, environment variables
- Rendering static or infrequently-changing content
- Large third-party libraries that don't need interactivity (syntax highlighters, Markdown renderers)

---

## Conclusion

React Server Components represent a genuine architectural shift — not an incremental improvement. The mental model takes time to internalise, but the payoff is real: smaller JavaScript bundles, simpler data fetching, and better performance for data-heavy applications.

The practical rules are learnable: default to Server Components, add `'use client'` at the lowest level that needs interactivity, fetch data directly with `async/await`, and use Suspense for streaming long-running fetches.

---

## TL;DR

- **Server Components:** render server-side only, no JS bundle, can be `async`, can access databases/files, no hooks
- **Client Components:** `'use client'` directive, run on server for initial render + client for updates, can use hooks and events
- **The boundary:** Server can render Client; Client cannot render Server (use `children` prop pattern instead)
- **Data fetching:** `async/await` directly in Server Components — no `useEffect`, no loading state for the initial fetch
- **Streaming:** wrap slow-data components in `<Suspense>` with a fallback to avoid blocking the page
- **Default to Server Components** — add `'use client'` only where you need interactivity, hooks, or browser APIs
