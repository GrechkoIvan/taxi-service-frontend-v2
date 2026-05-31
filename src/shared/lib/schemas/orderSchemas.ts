import { z } from 'zod'

export const orderComfortTypeSchema = z.enum(['economy', 'comfort', 'business'])

export const orderPanelSchema = z
  .object({
    comfortType: orderComfortTypeSchema,
    fromAddress: z.string().trim().optional(),
    toAddress: z.string().trim().optional(),
  })
  .strict()

export type OrderPanelForm = z.infer<typeof orderPanelSchema>
