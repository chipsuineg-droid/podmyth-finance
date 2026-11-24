import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch all active quotations that are either flagged as ORDER_PRESSED,
    // or are in ISSUED/DRAFT status
    const quotes = await prisma.document.findMany({
      where: {
        type: 'QUOTATION',
        status: { in: ['ORDER_PRESSED', 'ISSUED', 'DRAFT'] },
      },
      include: {
        client: true,
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { issueDate: 'desc' },
    })

    // Fetch all variants so we have current stock information for comparison
    const allVariants = await prisma.variant.findMany({
      include: { product: true },
    })

    const variantMap = new Map<string, (typeof allVariants)[0]>()
    for (const v of allVariants) {
      variantMap.set(v.id, v)
    }

    interface AggregatedOrderItem {
      key: string
      productName: string
      color: string
      size: string
      sku: string
      currentStock: number
      totalUnitsNeeded: number
      deficitUnits: number
      estUnitBuyPrice: number
      estTotalCost: number
      quotations: Array<{
        documentId: string
        refNumber: string
        clientName: string
        clientPhone?: string | null
        issueDate: string
        qty: number
        notes?: string | null
      }>
    }

    const aggregatedMap = new Map<string, AggregatedOrderItem>()
    const individualLines: Array<{
      id: string
      documentId: string
      refNumber: string
      clientName: string
      issueDate: string
      description: string
      notes?: string | null
      productName: string
      color: string
      size: string
      sku: string
      qty: number
      currentStock: number
      deficitUnits: number
      estUnitBuyPrice: number
      estTotalCost: number
    }> = []

    const qualifyingQuotes: typeof quotes = []

    for (const q of quotes) {
      let quoteHasMissingStock = q.status === 'ORDER_PRESSED'
      const pressedItemsForThisQuote = []

      for (const item of q.items) {
        let variant = item.variantId ? variantMap.get(item.variantId) : null

        // If no variantId, try matching by description / SKU
        if (!variant) {
          const descLower = item.description.toLowerCase()
          variant =
            allVariants.find(v => {
              const prodLower = v.product.name.toLowerCase()
              return (
                descLower.includes(prodLower) &&
                descLower.includes(v.color.toLowerCase()) &&
                descLower.includes(v.size.toLowerCase())
              )
            }) ?? null
        }

        const isService = variant?.product?.isService ?? false
        if (isService) continue

        const currentStock = variant?.stockQty ?? 0
        const isOutOfStock = currentStock < item.qty || q.status === 'ORDER_PRESSED'

        if (isOutOfStock) {
          quoteHasMissingStock = true

          let productName = variant?.product?.name || item.description
          let color = variant?.color || 'N/A'
          let size = variant?.size || 'N/A'
          const sku = variant?.sku || 'CUSTOM'
          const estUnitBuyPrice = Number(variant?.defaultBuyPrice || item.buyingPrice || 0)

          if (!variant) {
            const parts = item.description.split(/[,-]/).map(p => p.trim())
            if (parts.length >= 3) {
              productName = parts[0]
              color = parts[1]
              size = parts[2]
            } else if (parts.length === 2) {
              productName = parts[0]
              color = parts[1]
            }
          }

          const deficitUnits = Math.max(1, item.qty - currentStock)
          const estTotalCost = deficitUnits * estUnitBuyPrice

          const lineObj = {
            id: item.id,
            documentId: q.id,
            refNumber: q.refNumber,
            clientName: q.client.name,
            issueDate: q.issueDate.toISOString(),
            description: item.description,
            notes: item.notes,
            productName,
            color,
            size,
            sku,
            qty: item.qty,
            currentStock,
            deficitUnits,
            estUnitBuyPrice,
            estTotalCost,
          }

          individualLines.push(lineObj)
          pressedItemsForThisQuote.push(lineObj)

          const aggKey = `${productName.trim().toUpperCase()}__${color.trim().toUpperCase()}__${size.trim().toUpperCase()}`

          if (!aggregatedMap.has(aggKey)) {
            aggregatedMap.set(aggKey, {
              key: aggKey,
              productName,
              color,
              size,
              sku,
              currentStock,
              totalUnitsNeeded: item.qty,
              deficitUnits,
              estUnitBuyPrice,
              estTotalCost,
              quotations: [
                {
                  documentId: q.id,
                  refNumber: q.refNumber,
                  clientName: q.client.name,
                  clientPhone: q.client.phone,
                  issueDate: q.issueDate.toISOString(),
                  qty: item.qty,
                  notes: item.notes,
                },
              ],
            })
          } else {
            const existing = aggregatedMap.get(aggKey)!
            existing.totalUnitsNeeded += item.qty
            existing.deficitUnits += deficitUnits
            existing.estTotalCost += estTotalCost
            existing.quotations.push({
              documentId: q.id,
              refNumber: q.refNumber,
              clientName: q.client.name,
              clientPhone: q.client.phone,
              issueDate: q.issueDate.toISOString(),
              qty: item.qty,
              notes: item.notes,
            })
          }
        }
      }

      if (quoteHasMissingStock && pressedItemsForThisQuote.length > 0) {
        qualifyingQuotes.push(q)
      }
    }

    const aggregatedList = Array.from(aggregatedMap.values()).sort(
      (a, b) => b.totalUnitsNeeded - a.totalUnitsNeeded
    )

    const totalUnitsToOrder = aggregatedList.reduce((s, it) => s + it.totalUnitsNeeded, 0)
    const totalEstimatedCost = aggregatedList.reduce((s, it) => s + it.estTotalCost, 0)

    return ok({
      supplier: 'TANC',
      generatedAt: new Date().toISOString(),
      summary: {
        totalUnitsToOrder,
        distinctVariantsCount: aggregatedList.length,
        activeQuotationsCount: qualifyingQuotes.length,
        totalEstimatedCost,
      },
      aggregatedOrders: aggregatedList,
      individualLines,
      qualifyingQuotes: qualifyingQuotes.map(q => ({
        id: q.id,
        refNumber: q.refNumber,
        status: q.status,
        issueDate: q.issueDate,
        client: {
          id: q.client.id,
          name: q.client.name,
          phone: q.client.phone,
          city: q.client.city,
        },
        itemsCount: q.items.length,
      })),
    })
  } catch (e: any) {
    console.error(e)
    return err(e.message || 'Failed to generate order list')
  }
}
