import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { getNextRefNumber } from '@/lib/finance'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const quote = await prisma.document.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } } }
  })
  if (!quote) return err('Quotation not found', 404)
  if (quote.type !== 'QUOTATION') return err('Document is not a quotation')

  for (const item of quote.items) {
    if (!item.variantId || !item.variant || item.variant.product.isService) continue
    if (item.variant.stockQty < item.qty)
      return err(`Insufficient stock for "${item.description}". Available: ${item.variant.stockQty}`)
  }

  const refNumber = await getNextRefNumber('INVOICE')

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.document.create({
      data: {
        refNumber, type: 'INVOICE', status: 'ISSUED',
        clientId: quote.clientId, issueDate: new Date(),
        sourceQuoteId: quote.id, notes: quote.notes,
        totalSellPrice: quote.totalSellPrice, totalBuyPrice: quote.totalBuyPrice,
        netProfit: quote.netProfit, profitMargin: quote.profitMargin,
        items: {
          create: quote.items.map(item => ({
            variantId: item.variantId, description: item.description, notes: item.notes,
            qty: item.qty, buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice,
            lineTotal: item.lineTotal, lineCost: item.lineCost, lineProfit: item.lineProfit,
            sortOrder: item.sortOrder,
          }))
        }
      },
      include: { client: true, items: true }
    })
    await tx.document.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } })
    for (const item of quote.items) {
      if (!item.variantId || !item.variant || item.variant.product.isService) continue
      await tx.variant.update({ where: { id: item.variantId }, data: { stockQty: { decrement: item.qty } } })
      await tx.stockMovement.create({
        data: {
          variantId: item.variantId, type: 'SALE', qty: -item.qty,
          buyingPrice: item.buyingPrice, sellingPrice: item.sellingPrice, referenceId: inv.id,
        }
      })
    }
    return inv
  })

  return ok(invoice)
}
