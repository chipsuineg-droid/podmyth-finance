import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

const ExpenseSchema = z.object({
  category: z.enum(['PACKAGING', 'MARKETING', 'EQUIPMENT', 'TRANSPORT', 'OTHER']),
  description: z.string().min(1),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const expenses = await prisma.expense.findMany({
    where: {
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        }
      } : {}),
    },
    orderBy: { date: 'desc' },
  })
  return ok(expenses)
}

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = ExpenseSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.message)
  const expense = await prisma.expense.create({
    data: { ...parsed.data, amount: new Decimal(parsed.data.amount), date: new Date(parsed.data.date) }
  })
  return ok(expense)
}
