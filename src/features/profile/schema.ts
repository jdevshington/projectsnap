// src/features/profile/schema.ts

import { z } from "zod";

export const updateFullNameSchema = z.object({
  full_name: z.string().trim().min(1, "Name can't be empty."),
});

export const toggleUseNewUiSchema = z.object({
  use_new_ui: z.coerce.boolean(),
});
