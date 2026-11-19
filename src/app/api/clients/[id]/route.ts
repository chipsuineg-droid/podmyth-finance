import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        include: { items: { orderBy: { sortOrder: 'asc' } }, payments: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  if (!client) return err('Client not found', 404)
  return ok(client)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const client = await prisma.client.update({ where: { id: params.id }, data: body })
  return ok(client)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.client.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}
