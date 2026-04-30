import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const familyPeople = defineCollection({
  loader: glob({
    pattern: "**/*.json",
    base: "./src/content/family/people",
  }),
  schema: z.object({
    id: z.string(),
    fullName: z.string(),
    signName: z.string(),
    canSignLanguage: z.boolean().default(false),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    deathDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    notes: z.string().optional(),
  }),
});

const familyRelations = defineCollection({
  loader: glob({
    pattern: "**/*.json",
    base: "./src/content/family/relations",
  }),
  schema: z.object({
    rootGroupId: z.string(),
    groups: z.array(
      z.object({
        id: z.string(),
        parents: z.array(z.string()).min(1),
        children: z.array(z.string()),
      }),
    ),
  }),
});

export const collections = {
  familyPeople,
  familyRelations,
};
