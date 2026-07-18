// src/features/apartments/schema.ts

import { z } from "zod";

export const apartmentSchema = z.object({
  apartment_number: z.string().trim().min(1, "Apartment number is required."),
  location: z.string().trim().min(1, "Location is required."),
  notes: z.string().trim().optional(),
});
