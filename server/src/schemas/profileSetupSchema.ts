import { z } from "zod";

export const profileSetupSchema = z.object({
  bio: z
    .string()
    .min(1, "Bio must be at least 1 character")
    .max(150, "Bio must be less than 150 characters")
    .optional(),
});

export type ProfileSetupSchema = z.infer<typeof profileSetupSchema>;