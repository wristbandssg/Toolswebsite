import { z } from "zod";

// Validation for a page's section array, shared by the create (POST) and
// edit (PUT) page APIs. Keep it in step with PageSection in ./types.
export const pageSectionSchema = z.union([
  z.object({ type: z.literal("heading"), text: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional() }),
  z.object({ type: z.literal("paragraph"), text: z.string() }),
  z.object({ type: z.literal("image"), url: z.string(), alt: z.string().optional() }),
  z.object({ type: z.literal("button"), label: z.string(), href: z.string() }),
  z.object({ type: z.literal("spacer"), size: z.enum(["sm", "md", "lg"]).optional() }),
  z.object({ type: z.literal("calculator_embed"), toolSlug: z.string(), toolTitle: z.string() }),
  z.object({
    type: z.literal("box"),
    heading: z.string(),
    lead: z.string().optional(),
    html: z.string(),
    showNumber: z.boolean().optional(),
    collapsed: z.boolean().optional(),
  }),
]);

export const pageSectionsSchema = z.array(pageSectionSchema);
