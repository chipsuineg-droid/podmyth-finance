import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const ReconcileSchema = z.object({
  lines: z.array(z.object({ lineId: z.string(), physicalCount: z.number().int().min(0) })),
  notes: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = ReconcileSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const stockTake = await prisma.stockTake.findUnique({
    where: { id: params.id },
    include: { lines: { include: { variant: true } } }
  })
  if (!stockTake) return err('Stock take not found', 404)
  if (stockTake.status === 'RECONCILED') return err('Already reconciled')

  await prisma.$transaction(async (tx) => {
    for (const update of parsed.data.lines) {
      const line = stockTake.lines.find(l => l.id === update.lineId)
      if (!line) continue
      const variance = update.physicalCount - line.systemCount
      const varianceValue = new Decimal(Math.abs(variance)).mul(line.variant.defaultBuyPrice)

      await tx.stockTakeLine.update({
        where: { id: update.lineId },
        data: { physicalCount: update.physicalCount, variance, varianceValue }
      })

      if (variance !== 0) {
        await tx.variant.update({ where: { id: line.variantId }, data: { stockQty: update.physicalCount } })
        await tx.stockMovement.create({
          data: {
            variantId: line.variantId,
            type: variance > 0 ? 'ADJUSTMENT' : 'SHRINKAGE',
            qty: variance,
            buyingPrice: line.variant.defaultBuyPrice,
            sellingPrice: line.variant.defaultSellPrice,
            notes: `Stock take reconciliation`,
          }
        })
      }
    }
    await tx.stockTake.update({
      where: { id: params.id },
      data: { status: 'RECONCILED', reconciledAt: new Date(), notes: parsed.data.notes }
    })
  })
  return ok({ reconciled: true })
}
