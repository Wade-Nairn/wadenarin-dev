---
title: "TypeScript Patterns I Actually Use in Production"
description: "Not a TypeScript tutorial — a collection of specific patterns, utilities, and approaches that solve real problems in production React codebases."
slug: "/articles/typescript-patterns-production"
publishOrder: 6
category: "Technical"
date: "2025-05-05"
---

# TypeScript Patterns I Actually Use in Production

There's no shortage of TypeScript guides. What's rarer is a guide that skips the fundamentals you already know and focuses on the patterns that show up repeatedly in real, large-scale frontend codebases — the ones you reach for when a project gets complicated.

This is that guide. These are patterns I've used in production React applications, not constructs I've seen in documentation and found clever. Some are common knowledge; others are less discussed. All of them solve real problems.

---

## 1. Discriminated Unions for Component Variants

When a component has fundamentally different modes of operation, reaching for optional props creates an API that's easy to misuse. Discriminated unions enforce valid prop combinations at the type level.

```typescript
type ButtonProps =
  | { variant: 'primary'; onClick: () => void; href?: never }
  | { variant: 'link'; href: string; onClick?: never };

function Button(props: ButtonProps) {
  if (props.variant === 'link') {
    return <a href={props.href}>{/* ... */}</a>;
  }
  return <button onClick={props.onClick}>{/* ... */}</button>;
}
```

The `href?: never` and `onClick?: never` lines prevent the consumer from passing both props simultaneously. TypeScript will error at the call site rather than letting an invalid combination through to runtime.

This pattern scales well to more complex cases — loading states, empty states, error states — where the shape of data changes depending on the mode.

---

## 2. The `satisfies` Operator for Validated Constants

Introduced in TypeScript 4.9, `satisfies` lets you validate that a value matches a type while still inferring the narrowest possible type. It solves the frustrating "widened to string" problem that often comes from type annotations on object constants.

```typescript
type Route = {
  path: string;
  label: string;
  icon: React.ComponentType;
};

const ROUTES = {
  home: { path: '/', label: 'Home', icon: HomeIcon },
  about: { path: '/about', label: 'About', icon: AboutIcon },
} satisfies Record<string, Route>;

// ROUTES.home.path is inferred as '/' (literal), not string
```

Without `satisfies`, you'd annotate with `Record<string, Route>` and lose the literal types. With `satisfies`, you get both the validation and the narrow inference. This is particularly useful for configuration objects, route definitions, and theme tokens.

---

## 3. Generic Components with Constrained Type Parameters

Generic components are well documented, but the `extends` constraint on type parameters is used less often than it should be.

```typescript
type SelectProps<T extends { id: string; label: string }> = {
  options: T[];
  value: T | null;
  onChange: (value: T) => void;
  renderOption?: (option: T) => React.ReactNode;
};

function Select<T extends { id: string; label: string }>({
  options,
  value,
  onChange,
  renderOption,
}: SelectProps<T>) {
  // ...
}
```

The constraint `T extends { id: string; label: string }` means the component works with any object that has those minimum fields, while preserving the full type of whatever T actually is. The caller gets full type safety on `onChange` — they know they're receiving a `User`, not just a `{ id: string; label: string }`.

---

## 4. Template Literal Types for Event and Key Naming

Template literal types let you construct string literal types programmatically. This is useful for creating consistent, type-safe naming systems.

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;

type ClickEvent = EventName<'click'>; // 'onClick'
type ChangeEvent = EventName<'change'>; // 'onChange'

// Practical use: generating typed event handler props
type FormFieldEvents = {
  [K in 'focus' | 'blur' | 'change']: EventName<K>;
};
```

More practically, I use this for analytics event naming to ensure consistency:

```typescript
type PageName = 'home' | 'about' | 'contact';
type ElementName = 'button' | 'link' | 'form';
type AnalyticsEvent = `${PageName}_${ElementName}_clicked`;
```

Now `trackEvent` can only accept valid event name combinations, and autocomplete works correctly across the entire event namespace.

---

## 5. Utility Types in Combination

TypeScript's built-in utility types are individually well known. What's less documented is combining them to express complex constraints concisely.

```typescript
// A type where title is required but everything else from Article is optional
type ArticlePreview = Required<Pick<Article, 'title'>> & Partial<Omit<Article, 'title'>>;

// A readonly version of a nested type
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Props from a component, with some overridden
type CustomButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & {
  onClick: (event: React.MouseEvent, metadata: ClickMetadata) => void;
};
```

The `Omit` + spread pattern for extending native element props is particularly useful for wrapper components. You get all the native props forwarded correctly, override only what you need, and the consumer sees a clean, specific type.

---

## 6. Type Guards for Runtime Narrowing

Type guards let you perform runtime checks that TypeScript understands and uses to narrow types in subsequent code.

```typescript
function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ApiError).code === 'string'
  );
}

// Usage
const result = await fetchUser(id);
if (isApiError(result)) {
  // result is ApiError here
  showError(result.message);
} else {
  // result is User here
  displayUser(result);
}
```

User-defined type guards are particularly valuable when dealing with `unknown`-typed data from API responses or external sources. The alternative — casting with `as` — suppresses TypeScript's checks entirely and removes the safety net.

---

## 7. Mapped Types for Form State

Generating form state types from a data model keeps your form and your data in sync without duplication:

```typescript
type FormState<T> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isDirty: boolean;
  isSubmitting: boolean;
};

type UserFormState = FormState<User>;
```

When the `User` type changes, `UserFormState` updates automatically. No manual synchronisation, no drift between the form state shape and the data model.

---

## 8. `infer` for Extracting Types from Generics

The `infer` keyword inside conditional types lets you extract types that aren't otherwise accessible.

```typescript
// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? U : T;

// Extract the props type from a React component
type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

// Extract the return type of an async function
type AsyncReturn<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;
```

The `PropsOf` pattern is useful when you want to extend or manipulate the props of an existing component without importing the props type separately — particularly when the props type isn't exported.

---

## 9. Const Assertions for Tuple Types

When you need a fixed-length array with specific types at each position — a tuple — const assertions prevent TypeScript from widening the type to `string[]`.

```typescript
const BREAKPOINTS = ['sm', 'md', 'lg', 'xl'] as const;
type Breakpoint = (typeof BREAKPOINTS)[number]; // 'sm' | 'md' | 'lg' | 'xl'

// Without `as const`, this would be string[]
// With `as const`, it's readonly ['sm', 'md', 'lg', 'xl']
```

This is essential for deriving union types from arrays — a pattern that appears constantly when working with design token values, route definitions, and configuration constants.

---

## 10. Branded Types for Domain Primitives

Branded (or nominal) types prevent you from accidentally using one kind of string where another is expected — a subtle source of bugs in applications with multiple ID types.

```typescript
type UserId = string & { readonly __brand: 'UserId' };
type ProductId = string & { readonly __brand: 'ProductId' };

function createUserId(id: string): UserId {
  return id as UserId;
}

function fetchUser(id: UserId): Promise<User> { /* ... */ }
function fetchProduct(id: ProductId): Promise<Product> { /* ... */ }

const userId = createUserId('123');
const productId = '456' as ProductId;

fetchUser(userId); // ✅
fetchUser(productId); // ❌ TypeScript error
fetchUser('123'); // ❌ TypeScript error
```

This pattern adds zero runtime overhead — the brand is erased at compile time — but catches an entire class of bugs where IDs are passed in the wrong position.

---

## Conclusion

TypeScript's type system is deep enough that there's always a pattern better suited to your problem than casting to `any`. The patterns above appear in nearly every large frontend codebase I've worked in — and in each case, they exist because the simpler approach produced bugs or maintenance overhead that the type system could have caught.

The best way to develop an intuition for when to reach for each of these is to start applying them incrementally. Pick one, use it across your current project, and notice where it catches mistakes. That's how they become second nature.

---

## TL;DR

- **Discriminated unions** — enforce valid prop combinations at compile time
- **`satisfies` operator** — validate constants without widening literal types
- **Constrained generics** — components that work with any type meeting minimum requirements
- **Template literal types** — type-safe string naming systems for events, routes, analytics
- **Combined utility types** — `Omit`, `Pick`, `Partial`, `Required` in combination for precise shapes
- **Type guards** — runtime narrowing that TypeScript understands
- **Mapped types** — derive related types (form state, error maps) from data models
- **`infer`** — extract types from generics you don't control
- **Const assertions** — derive union types from arrays of constants
- **Branded types** — prevent ID mix-ups with zero runtime cost
