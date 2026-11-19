import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

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

  const doc = await prisma.document.findUnique({ where: { id: params.id } })
  if (!doc) return err('Document not found', 404)

  const newPaid = Number(doc.amountPaid) + parsed.data.amount
  const totalDue = Number(doc.totalSellPrice)
  const newStatus = newPaid >= totalDue ? 'PAID' : 'PARTIAL'

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        documentId: params.id,
        amount: new Decimal(parsed.data.amount),
        method: parsed.data.method,
        paidAt: new Date(parsed.data.paidAt),
        notes: parsed.data.notes,
      }
    })
    const updated = await tx.document.update({
      where: { id: params.id },
      data: {
        amountPaid: new Decimal(newPaid),
        status: newStatus,
        paymentMethod: parsed.data.method,
        paidDate: newStatus === 'PAID' ? new Date(parsed.data.paidAt) : undefined,
      },
      include: { client: true, payments: true }
    })
    return { payment, document: updated }
  })

  return ok(result)
}
