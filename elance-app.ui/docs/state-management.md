# State Management

This project uses a multi-layered approach to state management to balance performance and simplicity.

## 1. Server State (TanStack Query)
- **Tool**: `@tanstack/react-query`
- **Use for**: Caching data fetched from APIs on the client, managing loading/error states, and optimistic updates.
- **Location**: Define `queryFn` and `queryKey` within components or custom hooks.

## 2. Global UI State (Zustand)
- **Tool**: `zustand` + `persist`
- **Use for**: State that must be accessed by many components (e.g., Auth status, Theme, Shopping Cart).
- **Location**: `src/store/`
- **Persistence**: Pre-configured to save state in `localStorage`.

## 3. Server-Client Bridge (Server Actions)
- **Tool**: `next-safe-action` + `zod`
- **Use for**: Mutating data (POST, PATCH, DELETE) and performing secure backend operations.
- **Location**: `src/services/`

## 4. Local State (React Hooks)
- **Tool**: `useState`, `useReducer`
- **Use for**: State confined to a single component or a small branch of the tree.
