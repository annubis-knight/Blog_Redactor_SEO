import { z } from 'zod/v4'

const localEntitySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['quartier', 'entreprise', 'lieu', 'region']),
  aliases: z.array(z.string()).optional(),
})

export const localEntitiesDbSchema = z.object({
  quartiers: z.array(localEntitySchema),
  entreprises: z.array(localEntitySchema),
  lieux: z.array(localEntitySchema),
  regions: z.array(localEntitySchema),
})
