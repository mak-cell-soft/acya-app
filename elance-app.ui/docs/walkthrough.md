# Walkthrough: Adding a New Feature

Follow these steps to add a new "Products" feature to the boilerplate.

## 1. Define the Schema
Create a Zod schema for your data in `src/types/product.ts` or `src/services/product-actions.ts`.

## 2. Create the Server Action
In `src/services/product-actions.ts`, use `actionClient` to define your mutation.

```tsx
export const addProductAction = actionClient
  .schema(z.object({ name: z.string() }))
  .action(async ({ parsedInput }) => {
    // DB logic here
    return { success: true };
  });
```

## 3. Build the UI Component
Create a new component in `src/components/shared/product-form.tsx`. Use `useAction` from `next-safe-action/hooks`.

## 4. Add the Route
Create `src/app/products/page.tsx` and import your component.

## 5. Add Global State (Optional)
If you need to track the "Recently Viewed" products, add a slice to the Zustand store in `src/store/`.
