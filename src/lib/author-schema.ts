import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((s) => (s ? s : null));

export const authorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  jobTitle: optionalText,
  photo: optionalText,
  shortBio: z
    .string()
    .trim()
    .max(400, "Short bio should be 400 characters or less")
    .optional()
    .nullable()
    .transform((s) => (s ? s : null)),
  bio: optionalText,
  expertise: z.array(z.string().trim().min(1)).default([]),
  email: optionalText,
  website: optionalText,
  linkedin: optionalText,
  twitter: optionalText,
  facebook: optionalText,
  isDefault: z.boolean().default(false),
});
