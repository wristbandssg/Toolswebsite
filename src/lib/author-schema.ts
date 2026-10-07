import { z } from "zod";
import { AUTHOR_SOCIAL_KEYS } from "@/lib/author-social";

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
  socialLinks: z
    .array(
      z
        .object({
          platform: z.enum(AUTHOR_SOCIAL_KEYS),
          url: z.string().trim().min(1, "Every link needs a URL"),
          label: z.string().trim().max(40, "Custom link names should be 40 characters or less").optional().nullable(),
        })
        .refine((l) => l.platform !== "custom" || !!l.label, "Give each custom link a name")
        .transform((l) => (l.platform === "custom" ? l : { platform: l.platform, url: l.url }))
    )
    .max(30, "That's a lot of links — keep it to 30 or fewer")
    .default([]),
  isDefault: z.boolean().default(false),
});
