import { z } from 'zod/v4'

export const themeConfigSchema = z.object({
  avatar: z.object({
    sector: z.string(),
    companySize: z.string(),
    location: z.string(),
    budget: z.string(),
    digitalMaturity: z.string(),
  }),
  positioning: z.object({
    targetAudience: z.string(),
    mainPromise: z.string(),
    differentiators: z.array(z.string()),
    painPoints: z.array(z.string()),
  }),
  offerings: z.object({
    services: z.array(z.string()),
    mainCTA: z.string(),
    ctaTarget: z.string(),
  }),
  toneOfVoice: z.object({
    style: z.string(),
    vocabulary: z.array(z.string()),
  }),
})
