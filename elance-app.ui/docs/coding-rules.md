# Coding Rules & Conventions

## General Rules
- ✅ **Do** use TypeScript's strict mode.
- ✅ **Do** use absolute imports via `@/*`.
- ❌ **Don't** use `any`. Use `unknown` or define an interface.
- ✅ **Do** use `kebab-case` for file/folder names (except React components).
- ✅ **Do** use `PascalCase` for React components.
- ✅ **Do** add `'use client'` explicitly to components that use hooks or browser events.

## Component Structure
```tsx
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface Props {
  title: string;
}

export function MyComponent({ title }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-4"
    >
      <h1 className="text-xl font-bold">{title}</h1>
      <Button onClick={() => console.log('Clicked')}>Click Me</Button>
    </motion.div>
  );
}
```

## Naming Conventions
- Hooks: `use[Name]` (e.g., `useAppStore`)
- Server Actions: `[name]Action` (e.g., `updateUserAction`)
- Schemas: `[name]Schema` (Zod schemas)
- Types: Use PascalCase for Interfaces/Types.
