import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { getNextRefNumber } from '@/lib/finance'
import { Decimal } from '@prisma/client/runtime/library'
import { revalidateAllFinancialViews } from '@/lib/reconciliation'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const allowBackorder = Boolean(body?.allowBackorder)

  const quote = await prisma.document.findUnique({
    where: { id: params.id },
    include: { items: { include: { variant: { include: { product: true } } } } }
  })
  if (!quote) return err('Quotation not found', 404)
  if (quote.type !== 'QUOTATION') return err('Document is not a quotation')

  // Live Catalog Lookup: check available stock for physical items
  for (const item of quote.items) {
    if (!item.variantId || !item.variant || item.variant.product.isService) continue
    if (item.variant.stockQty < item.qty && !allowBackorder) {
      return Response.json({
        success: false,
        error: `Item "${item.description}" still out of stock in Catalog (Available: ${item.variant.stockQty}, Quoted: ${item.qty}). Restock via Receive Shipment first, or confirm Backorder Override.`,
        canOverride: true,
      }, { status: 400 })
    }
  }

  const refNumber = await getNextRefNumber('INVOICE')

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.document.create({
      data: {
        refNumber,
        type: 'INVOICE',
        status: 'DELIVERED_PENDING',
        clientId: quote.clientId,
        issueDate: new Date(),
        sourceQuoteId: quote.id,
        notes: quote.notes,
        totalSellPrice: quote.totalSellPrice,
        totalBuyPrice: quote.totalBuyPrice,
        netProfit: quote.netProfit,
        profitMargin: quote.profitMargin,
        items: {
          create: quote.items.map(item => ({
            variantId: item.variantId,
            description: item.description,
            notes: item.notes,
            qty: item.qty,
            buyingPrice: item.buyingPrice,
            sellingPrice: item.sellingPrice,
            lineTotal: item.lineTotal,
            lineCost: item.lineCost,
            lineProfit: item.lineProfit,
            sortOrder: item.sortOrder,
          }))
        }
      },
      include: { client: true, items: true }
    })

    await tx.document.update({
      where: { id: quote.id },
      data: { status: 'ACCEPTED' }
    })

    // Immediate Stock Deduction and OUTBOUND_SALE movement
    for (const item of quote.items) {
      if (!item.variantId || !item.variant || item.variant.product.isService) continue
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
          referenceId: inv.id,
          notes: `Stock deducted on quotation conversion for invoice ${inv.refNumber}`,
        }
      })
    }

    return inv
  })

  revalidateAllFinancialViews()
  return ok(invoice)
}
