import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidateAllFinancialViews } from '@/lib/reconciliation'

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
  paymentMethod: z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const currentDoc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } }, payments: true }
  })
  if (!currentDoc) return err('Document not found', 404)

  const newStatus = parsed.data.status ?? currentDoc.status
  const isInvoice = currentDoc.type === 'INVOICE'

  const doc = await prisma.$transaction(async (tx) => {
    // 1. If marking PAID
    if (isInvoice && newStatus === 'PAID' && currentDoc.status !== 'PAID') {
      const sellPrice = Number(currentDoc.totalSellPrice)
      const totalPayments = currentDoc.payments.reduce((s, p) => s + Number(p.amount), 0)
      if (totalPayments < sellPrice) {
        await tx.payment.create({
          data: {
            documentId: currentDoc.id,
            amount: new Decimal(sellPrice - totalPayments),
            method: parsed.data.paymentMethod || currentDoc.paymentMethod || 'USD_CASH',
            paidAt: new Date(),
            notes: `Settled via status update for ${currentDoc.refNumber}`,
          }
        })
      }
      // Idempotent stock check
      for (const item of currentDoc.items) {
        if (!item.variantId || !item.variant || item.variant.product.isService) continue
        const existingMovement = await tx.stockMovement.findFirst({
          where: { referenceId: currentDoc.id, variantId: item.variantId, type: { in: ['SALE', 'OUTBOUND_SALE'] } }
        })
        if (!existingMovement) {
          await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { decrement: item.qty } } })
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId, type: 'OUTBOUND_SALE', qty: -item.qty,
              buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice,
              referenceId: currentDoc.id, notes: `Stock deducted on payment for invoice ${currentDoc.refNumber}`,
            }
          })
        }
      }
    }

    // 2. If reverting from PAID to UNPAID (DELIVERED_PENDING)
    if (isInvoice && currentDoc.status === 'PAID' && (newStatus === 'DELIVERED_PENDING' || newStatus === 'ISSUED')) {
      await tx.payment.deleteMany({ where: { documentId: currentDoc.id } })
      await tx.document.update({
        where: { id: currentDoc.id },
        data: { amountPaid: new Decimal(0), paidDate: null }
      })
    }

    // 3. If VOID / CANCELLED: restore stock idempotently
    if (isInvoice && (newStatus === 'VOID' || newStatus === 'CANCELLED') && currentDoc.status !== 'VOID' && currentDoc.status !== 'CANCELLED') {
      for (const item of currentDoc.items) {
        if (!item.variantId || !item.variant || item.variant.product.isService) continue
        const outMovement = await tx.stockMovement.findFirst({
          where: { referenceId: currentDoc.id, variantId: item.variantId, qty: { lt: 0 } }
        })
        const returnMovement = await tx.stockMovement.findFirst({
          where: { referenceId: currentDoc.id, variantId: item.variantId, type: { in: ['RETURN', 'RETURN_VOID'] } }
        })
        if (outMovement && !returnMovement) {
          await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { increment: item.qty } } })
          await tx.stockMovement.create({
            data: {
              variantId: item.variantId, type: 'RETURN_VOID', qty: item.qty,
              buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice,
              referenceId: currentDoc.id, notes: `Restored stock for voided invoice ${currentDoc.refNumber}`,
            }
          })
        }
      }
      await tx.payment.deleteMany({ where: { documentId: currentDoc.id } })
    }

    const updated = await tx.document.update({
      where: { id: params.id },
      data: {
        status: newStatus,
        ...(newStatus === 'PAID' ? { amountPaid: currentDoc.totalSellPrice, paidDate: currentDoc.paidDate || new Date() } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        ...(parsed.data.dueDate !== undefined ? { dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } : {}),
      },
      include: { client: true, items: true }
    })

    return updated
  })

  revalidateAllFinancialViews()
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
            variantId: item.variantId, type: 'RETURN_VOID', qty: item.qty,
            buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice,
            referenceId: doc.id, notes: `Restored stock on deletion of document ${doc.refNumber}`,
          }
        })
      }
      await tx.payment.deleteMany({ where: { documentId: doc.id } })
    }
    await tx.document.delete({ where: { id: params.id } })
  })

  revalidateAllFinancialViews()
  return ok({ deleted: true })
}
