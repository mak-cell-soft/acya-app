"use server";

import { actionClient } from "@/lib/safe-action";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(3).max(20),
});

export const sampleAction = actionClient
  .schema(schema)
  .action(async ({ parsedInput: { name } }) => {
    // Simulate a database call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      message: `Hello ${name}! This was a type-safe server action.`,
    };
  });
