// src/features/auth/schema.ts

import { z } from "zod";

export const signUpSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });
