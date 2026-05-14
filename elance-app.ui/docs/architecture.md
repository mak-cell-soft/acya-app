# Next.js Architecture

This project follows a modern **Server-First Architecture** utilizing the Next.js App Router.

## Layers

- **App (`src/app`)**: Routing, Layouts, and Server Components.
- **Components (`src/components`)**:
  - `ui/`: Radix-based primitives (Shadcn).
  - `shared/`: Reusable cross-feature components.
- **Services (`src/services`)**: Server Actions and business logic.
- **Store (`src/store`)**: Client-side state management (Zustand).
- **Lib (`src/lib`)**: Shared utilities, constants, and third-party configurations.

## Rules

### Server vs. Client Components
- ✅ **Server Components (Default)**: Fetch data, access backend resources, and keep sensitive logic on the server.
- ✅ **Client Components (`'use client'`)**: Add interactivity, use browser APIs, or manage local state.
- ❌ **Avoid** using `'use client'` at the top level of the tree. Keep it as low as possible.

### Data Flow
- **Server -> Client**: Passed via Props from RSC to Client Components.
- **Client -> Server**: Handled via **Server Actions** (Safe-Actions).
- **Client -> Client**: Handled via **Zustand** or React Context.

### Dependency Flow
- `app` → `services` → `lib`
- `app` → `components`
- `components` → `lib`
- `lib` must not depend on higher layers.
