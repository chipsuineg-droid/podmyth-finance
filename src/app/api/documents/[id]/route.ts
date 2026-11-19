import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { client: true, items: { orderBy: { sortOrder: 'asc' } }, payments: { orderBy: { paidAt: 'desc' } } }
  })
  if (!doc) return err('Document not found', 404)
  return ok(doc)
}

const UpdateSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().optional().nullable(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)
  const doc = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
    },
    include: { client: true, items: true }
  })
  return ok(doc)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } } }
  })
  if (!doc) return err('Not found', 404)

  await prisma.$transaction(async (tx) => {
    if (doc.type === 'INVOICE' && doc.status !== 'VOID' && doc.status !== 'CANCELLED') {
      for (const item of doc.items) {
        if (!item.variantId || !item.variant || item.variant.product.isService) continue
        await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.qty } } })
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId, type: 'RETURN', qty: item.qty,
            buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice,
            referenceId: doc.id, notes: `Voided document ${doc.refNumber}`,
          }
        })
      }
    }
    await tx.document.delete({ where: { id: params.id } })
  })

  return ok({ deleted: true })
}
