import { z } from 'zod';

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(z.any()),
});

const correctiveActionSchema = z.object({
  id: z.string(),
  ecart: z.string(),
  actionCorrective: z.string(),
  delai: z.string(),
  quand: z.string(),
  visa: z.string(),
  verification: z.string(),
});

export const createAuditSchema = z.object({
  body: z.object({
    dateExecution: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
      z.string().datetime(),
      z.string(), // Accepter n'importe quel format de date string
    ]),
    adresse: z.string().nullable().optional(),
    categories: z.array(categorySchema),
    correctiveActions: z.array(correctiveActionSchema).optional(),
  }),
});

export const updateAuditSchema = z.object({
  body: z.object({
    dateExecution: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Invalid date format'),
      z.string().datetime(),
      z.string(), // Accepter n'importe quel format de date string
    ]).optional(),
    adresse: z.string().nullable().optional(),
    categories: z.array(categorySchema).optional(),
    correctiveActions: z.array(correctiveActionSchema).optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Audit ID is required'), // Accepter ObjectId MongoDB ou UUID
  }),
});

