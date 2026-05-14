# Folder Structure

```text
src/
├── app/               # Routing, Pages, and Layouts
│   ├── demo/          # Tech stack showcase route
│   ├── favicon.ico    # Favicon
│   ├── globals.css    # Tailwind 4 global styles
│   ├── layout.tsx     # Root layout with Providers
│   └── page.tsx       # Homepage (Hero Section)
├── components/        # UI and Shared components
│   ├── shared/        # Reusable business components
│   └── ui/            # Shadcn UI primitives
├── hooks/             # Custom React hooks
├── lib/               # Shared utilities and configs
│   ├── safe-action.ts # Next-Safe-Action client
│   └── utils.ts       # CN utility for Tailwind classes
├── services/          # Server Actions and API logic
│   └── sample-actions.ts # Example Server Action
├── store/             # Zustand stores
│   └── use-app-store.ts  # Persisted global state
└── types/             # Global TypeScript definitions
```

## Description
- **`app/`**: Uses the Next.js App Router. Each folder is a route.
- **`components/ui/`**: Low-level, pure UI components. Modified only when changing the design system.
- **`services/`**: The bridge between Frontend and Backend using Server Actions.
- **`store/`**: Used for state that needs to survive route changes or be persisted locally.
