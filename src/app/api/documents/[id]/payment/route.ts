import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidateAllFinancialViews } from '@/lib/reconciliation'

const PaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['USD_CASH', 'ECOCASH', 'INNBUCKS', 'BANK_NOSTRO']),
  paidAt: z.string(),
  notes: z.string().optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const parsed = PaymentSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)

  const doc = await prisma.document.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } } }
  })
  if (!doc) return err('Document not found', 404)

  const newPaid = Number(doc.amountPaid) + parsed.data.amount
  const totalDue = Number(doc.totalSellPrice)
  const isNowPaid = newPaid >= totalDue
  const newStatus = isNowPaid ? 'PAID' : 'PARTIAL'

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Payment record
    const payment = await tx.payment.create({
      data: {
        documentId: params.id,
        amount: new Decimal(parsed.data.amount),
        method: parsed.data.method,
        paidAt: new Date(parsed.data.paidAt),
        notes: parsed.data.notes,
      }
    })

    // 2. Update document
    const updated = await tx.document.update({
      where: { id: params.id },
      data: {
        amountPaid: new Decimal(newPaid),
        status: newStatus,
        paymentMethod: parsed.data.method,
        paidDate: isNowPaid ? new Date(parsed.data.paidAt) : doc.paidDate,
      },
      include: { client: true, payments: true }
    })

    // 3. Idempotent Stock Check: If stock was not deducted when invoice was issued, deduct now
    for (const item of doc.items) {
      if (!item.variantId || !item.variant || item.variant.product.isService) continue
      const existingMovement = await tx.stockMovement.findFirst({
        where: {
          referenceId: doc.id,
          variantId: item.variantId,
          type: { in: ['SALE', 'OUTBOUND_SALE'] }
        }
      })
      if (!existingMovement) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: { stockQty: { decrement: item.qty } }
        })
        await tx.stockMovement.create({
          data: {
            variantId: item.variantId,
            type: 'OUTBOUND_SALE',
            qty: -item.qty,
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            referenceId: doc.id,
            notes: `Stock deducted on payment for invoice ${doc.refNumber}`,
          }
        })
      }
    }

    return { payment, document: updated }
  })

  revalidateAllFinancialViews()
  return ok(result)
}
