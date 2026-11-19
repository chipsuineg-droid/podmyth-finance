import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.expense.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}
