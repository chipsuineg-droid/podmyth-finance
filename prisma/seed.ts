import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

function d(val: number | string) {
  return new Decimal(val)
}

async function main() {
  console.log('Synchronizing authentic PodMyth database baseline...')

  // ── 1. Clear All Tables (Clean Slate) ──────────────────────────────────────
  await prisma.payment.deleteMany({})
  await prisma.documentItem.deleteMany({})
  await prisma.document.deleteMany({})
  await prisma.stockMovement.deleteMany({})
  await prisma.stockTakeLine.deleteMany({})
  await prisma.stockTake.deleteMany({})
  await prisma.variant.deleteMany({})
  await prisma.product.deleteMany({})
  await prisma.category.deleteMany({})
  await prisma.client.deleteMany({})
  await prisma.expense.deleteMany({})
  await prisma.memberSubscription.deleteMany({})
  await prisma.actionPoint.deleteMany({})
  await prisma.sequence.deleteMany({})

  // ── 2. Sequences ───────────────────────────────────────────────────────────
  await prisma.sequence.create({ data: { id: 'QUOTATION', year: 2026, counter: 0 } })
  await prisma.sequence.create({ data: { id: 'INVOICE', year: 2026, counter: 2 } })

  // ── 3. Categories (Apparel & Outerwear Only — No generic service categories) ─
  const catApparel = await prisma.category.create({ data: { name: 'Medical Apparel & Scrubs' } })
  const catOuterwear = await prisma.category.create({ data: { name: 'Lab Coats & Softshell Jackets' } })

  async function createProduct(id: string, name: string, categoryId: string, defaultSell: number) {
    return prisma.product.create({
      data: { id, name, categoryId, defaultSellPrice: d(defaultSell), isService: false }
    })
  }

  async function createVariant(productId: string, color: string, size: string, buy: number, sell: number, stock: number) {
    const sku = `${productId}-${color.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${size}`.slice(0, 80)
    return prisma.variant.create({
      data: {
        productId,
        color,
        size,
        sku,
        defaultBuyPrice: d(buy),
        defaultSellPrice: d(sell),
        stockQty: stock,
        lowStockThreshold: 2,
      }
    })
  }

  // ── 4. Authentic Products (Strictly Real Physical Merchandise) ─────────────
  const prodTancCore = await createProduct('tanc-core', 'TANC Core Scrub Set', catApparel.id, 30)
  const prodTancLite = await createProduct('tanc-lite', 'TANC Lite Scrub Set', catApparel.id, 35)
  const prodUnderScrubs = await createProduct('underscrub', 'UnderScrubs (Female)', catApparel.id, 20)
  const prodEFScrub = await createProduct('ef-scrub', 'Breast Cancer EF Top', catApparel.id, 20)
  const prodDrsJacketLS = await createProduct('drs-jacket-ls', "Dr's Jacket (Long Sleeve)", catOuterwear.id, 18)
  const prodDrsJacketSS = await createProduct('drs-jacket-ss', "Dr's Jacket (Short Sleeve)", catOuterwear.id, 18)
  const prodSoftshellMen = await createProduct('softshell-men', "MEN'S SoftShell Jacket", catOuterwear.id, 35)

  // ── 5. Exact Physical Stock Take (20 Variants, 24 Units = $694.00 Valuation) ─
  const physicalCatalog = [
    // TANC Core: Buy $18, Sell $30
    { p: prodTancCore, c: 'Lilac', s: 'S', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Black', s: 'L', buy: 18, sell: 30, qty: 2 },
    { p: prodTancCore, c: 'Black', s: 'XL', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Black', s: 'M', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Navy Blue', s: 'M', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Navy Blue', s: 'XL', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Charcoal Grey', s: 'XL', buy: 18, sell: 30, qty: 1 },
    { p: prodTancCore, c: 'Charcoal Grey', s: 'XS', buy: 18, sell: 30, qty: 2 },

    // TANC Lite: Buy $21, Sell $35
    { p: prodTancLite, c: 'Black', s: 'M', buy: 21, sell: 35, qty: 3 },
    { p: prodTancLite, c: 'Charcoal Grey', s: 'M', buy: 21, sell: 35, qty: 1 },

    // MEN'S SoftShell Jacket: Buy $28, Sell $35
    { p: prodSoftshellMen, c: 'Navy Blue', s: 'M', buy: 28, sell: 35, qty: 1 },
    { p: prodSoftshellMen, c: 'Black', s: 'S', buy: 28, sell: 35, qty: 1 },
    { p: prodSoftshellMen, c: 'Black', s: 'M', buy: 28, sell: 35, qty: 1 },
    { p: prodSoftshellMen, c: 'Black', s: 'L', buy: 28, sell: 35, qty: 1 },

    // Dr's Jackets: Buy $13, Sell $18
    { p: prodDrsJacketLS, c: 'White', s: 'L', buy: 13, sell: 18, qty: 1 },
    { p: prodDrsJacketSS, c: 'White', s: 'L', buy: 13, sell: 18, qty: 1 },
    { p: prodDrsJacketSS, c: 'White', s: 'M', buy: 13, sell: 18, qty: 1 },

    // UnderScrubs: Buy $12, Sell $20
    { p: prodUnderScrubs, c: 'Female Black', s: 'S', buy: 12, sell: 20, qty: 1 },

    // EF Tops: Buy $14, Sell $20
    { p: prodEFScrub, c: 'Breast Cancer Pink/Black', s: 'M', buy: 14, sell: 20, qty: 1 },
    { p: prodEFScrub, c: 'Breast Cancer Pink/Black', s: 'XL', buy: 14, sell: 20, qty: 1 },
  ]

  for (const item of physicalCatalog) {
    await createVariant(item.p.id, item.c, item.s, item.buy, item.sell, item.qty)
  }

  // ── 6. Client Directory (Directory Preserved; Past Revenues Nullified to $0) ─
  const clientData = [
    { id: 'c-st-john', name: 'St John Ambulance', phone: '+263 77 412 3456', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-dr-tawo', name: 'Dr. Tawo', phone: '+263 77 567 8901', city: 'Harare', deliveryZone: 'Harare Hospital' },
    { id: 'c-dr-karie', name: 'Dr. Karie', phone: '+263 77 210 1122', city: 'Harare', deliveryZone: 'Parirenyatwa / CBD' },
    { id: 'c-kuziva', name: 'Kuziva Zvokuomba', phone: '+263 77 345 6789', city: 'Harare', deliveryZone: 'Avenues Clinic' },
    { id: 'c-shawn', name: 'Shawn (Internal Rep)', phone: '+263 77 678 9012', city: 'Harare', deliveryZone: 'Sales Operations' },
    { id: 'c-genius', name: 'Genius Chipfupa', phone: '+263 77 789 0123', city: 'Harare', deliveryZone: 'Partner Rep' },
    { id: 'c-dr-rushwaya', name: 'Dr. R. Rushwaya', phone: '+263 77 890 1234', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-kuzivakwashe', name: 'Kuzivakwashe Sunga', phone: '+263 77 901 2345', city: 'Harare', deliveryZone: 'Avondale' },
    { id: 'c-tanatswa', name: 'Tanatswa Masungo', phone: '+263 77 012 3456', city: 'Harare', deliveryZone: 'Borrowdale' },
    { id: 'c-tino', name: 'Tino Kambani', phone: '+263 77 123 4567', city: 'Harare', deliveryZone: 'Belgravia' },
    { id: 'c-doc-munashe', name: 'Doc Munashe', phone: '+263 77 234 5678', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-dominic', name: 'Dominic Dube', phone: '+263 77 345 6780', city: 'Bulawayo', deliveryZone: 'Mpilo Hospital' },
    { id: 'c-dr-chiwanga', name: 'Dr. Chiwanga', phone: '+263 77 456 7891', city: 'Harare', deliveryZone: 'Milton Park' },
    { id: 'c-mama-k', name: 'Mama K', phone: '+263 77 567 8902', city: 'Harare', deliveryZone: 'Chitungwiza' },
    { id: 'c-shiloh', name: 'Shiloh', phone: '+263 77 678 9013', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-blessing', name: 'Blessing Mabverengedze', phone: '+263 77 789 0124', city: 'Mutare', deliveryZone: 'Provincial Hospital' },
    { id: 'c-tadiwa', name: 'Tadiwa Makahamadze', phone: '+263 77 890 1235', city: 'Harare', deliveryZone: 'Executive' },
    { id: 'c-dr-patie', name: 'Dr. Patie', phone: '+263 77 901 2346', city: 'Harare', deliveryZone: 'Parirenyatwa' },
    { id: 'c-audrey', name: 'Audrey', phone: '+263 77 012 3457', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-tafadzwa', name: 'Tafadzwa', phone: '+263 77 123 4568', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-katena', name: 'Katena', phone: '+263 77 234 5679', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-matiashe', name: 'Matiashe', phone: '+263 77 345 6781', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-russel', name: 'Russel', phone: '+263 77 456 7892', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-samykays', name: 'SamyKays', phone: '+263 77 567 8903', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-vinia', name: 'Vinia Machokoto', phone: '+263 77 678 9014', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-mbchb-iv', name: 'MBChB IV Class Rep', phone: '+263 77 789 0125', city: 'Harare', deliveryZone: 'Medical School' },
    { id: 'c-amanda', name: 'Amanda', phone: '+263 77 890 1236', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-ngoni', name: 'Ngonidzashe Zimbwa', phone: '+263 77 901 2347', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-tunga', name: 'Tunga', phone: '+263 77 012 3458', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-dineo', name: 'Dineo', phone: '+263 77 123 4569', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-nyasha', name: 'Nyasha Ndoro', phone: '+263 77 234 5670', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-mel', name: 'Mel', phone: '+263 77 345 6782', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-candice', name: 'Candice', phone: '+263 77 456 7893', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-chamu', name: 'Chamu', phone: '+263 77 567 8904', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-dr-chitsike', name: 'Dr. Chitsike', phone: '+263 77 678 9015', city: 'Harare', deliveryZone: 'Parirenyatwa' },
    { id: 'c-natasha', name: 'Natasha', phone: '+263 77 789 0126', city: 'Harare', deliveryZone: 'CBD' },
    { id: 'c-munashe-rep', name: 'Munashe (Sales Rep)', phone: '+263 77 890 1237', city: 'Harare', deliveryZone: 'Medical Rep' },
    { id: 'c-persiema', name: 'Mr. Persiema RGN/OTN', phone: '+263 77 901 2348', city: 'Harare', deliveryZone: 'Theatre Nurse' },
  ]

  for (const c of clientData) {
    await prisma.client.create({ data: c })
  }

  // ── 7. Open Pending Receivables (ONLY St John and Tawo) ────────────────────
  // All other 38 clients start FRESH with $0.00 lifetime revenue and 0 orders.

  // 1. St John Ambulance — $30.00 Outstanding Balance
  await prisma.document.create({
    data: {
      refNumber: 'PM-INV-2026-001',
      type: 'INVOICE',
      status: 'DELIVERED_PENDING',
      clientId: 'c-st-john',
      issueDate: new Date('2026-11-20'),
      totalSellPrice: d(30),
      totalBuyPrice: d(18),
      netProfit: d(12),
      profitMargin: d(40),
      amountPaid: d(0),
      notes: 'St John Ambulance is owing $30.00',
      items: {
        create: [
          {
            description: 'TANC Core Scrub Set – Charcoal / XS',
            qty: 1,
            buyingPrice: d(18),
            sellingPrice: d(30),
            lineTotal: d(30),
            lineCost: d(18),
            lineProfit: d(12),
            sortOrder: 0
          }
        ]
      }
    }
  })

  // 2. Dr. Tawo — $2.00 Outstanding Balance ($20 paid, $2 remaining)
  const tawoInv = await prisma.document.create({
    data: {
      refNumber: 'PM-INV-2026-002',
      type: 'INVOICE',
      status: 'PARTIAL',
      clientId: 'c-dr-tawo',
      issueDate: new Date('2026-11-20'),
      totalSellPrice: d(22),
      totalBuyPrice: d(18),
      netProfit: d(4),
      profitMargin: d(18.2),
      amountPaid: d(20),
      notes: 'Dr. Tawo is owing $2.00',
      items: {
        create: [
          {
            description: 'TANC Core Scrub Set – Navy Blue / L',
            qty: 1,
            buyingPrice: d(18),
            sellingPrice: d(22),
            lineTotal: d(22),
            lineCost: d(18),
            lineProfit: d(4),
            sortOrder: 0
          }
        ]
      }
    }
  })

  await prisma.payment.create({
    data: {
      documentId: tawoInv.id,
      amount: d(20),
      method: 'USD_CASH',
      paidAt: new Date('2026-11-20'),
      notes: 'Dr. Tawo initial deposit ($2 balance remaining)'
    }
  })

  // ── 8. Action Points ───────────────────────────────────────────────────────
  const actionPoints = [
    { title: 'Collect outstanding payment from St John', amount: d(30), category: 'COLLECT_CLIENT', person: 'St John Ambulance', status: 'PENDING', notes: 'St John is owing $30.00' },
    { title: 'Collect outstanding payment from Dr Tawo', amount: d(2), category: 'COLLECT_CLIENT', person: 'Dr. Tawo', status: 'PENDING', notes: 'Tawo is owing $2.00' },
    { title: 'Update physical stock records as items are sold', amount: d(0), category: 'OPERATIONAL', person: 'PodMyth Team', status: 'COMPLETED', notes: 'Real stock take reconciled ($694 selling valuation)' },
  ]
  for (const ap of actionPoints) {
    await prisma.actionPoint.create({ data: ap })
  }

  // Expenses: 0 (Clean baseline — future expenses will be logged going forward)
  // Subscriptions: 0 (Clean baseline)

  console.log('Authentic PodMyth database seed completed successfully.')
}

export { main }

if (require.main === module) {
  main()
    .catch(e => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
