"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
function d(val) {
    return new client_1.Prisma.Decimal(val);
}
async function main() {
    console.log('Seeding authentic PodMyth database with complete sales ledger...');
    // Clear existing records
    await prisma.actionPoint.deleteMany({});
    await prisma.memberSubscription.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.documentItem.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.stockTakeLine.deleteMany({});
    await prisma.stockTake.deleteMany({});
    await prisma.variant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.client.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.sequence.deleteMany({});
    // ── Sequences ──────────────────────────────────────────────────────────────
    await prisma.sequence.create({ data: { id: 'QUOTATION', year: 2026, counter: 14 } });
    await prisma.sequence.create({ data: { id: 'INVOICE', year: 2026, counter: 82 } });
    // ── Categories ────────────────────────────────────────────────────────────
    const catApparel = await prisma.category.create({ data: { name: 'Medical Apparel & Scrubs' } });
    const catOuterwear = await prisma.category.create({ data: { name: 'Lab Coats & Softshell Jackets' } });
    const catGear = await prisma.category.create({ data: { name: 'Diagnostic Gear & Accessories' } });
    const catServices = await prisma.category.create({ data: { name: 'Customization & Services' } });
    async function createProduct(id, name, categoryId, defaultSell, isService = false) {
        return prisma.product.create({
            data: { id, name, categoryId, defaultSellPrice: d(defaultSell), isService }
        });
    }
    async function createVariant(productId, color, size, buy, sell, stock) {
        const sku = `${productId}-${color.toUpperCase().replace(/[^A-Z0-9]/g, '')}-${size}`.slice(0, 80);
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
        });
    }
    // ── Products ───────────────────────────────────────────────────────────────
    const prodTancCore = await createProduct('tanc-core', 'TANC Core Scrub Set', catApparel.id, 30);
    const prodTancLite = await createProduct('tanc-lite', 'TANC Lite Scrub Set', catApparel.id, 35);
    const prodUnderScrubs = await createProduct('underscrub', 'UnderScrubs (Male / Female)', catApparel.id, 20);
    const prodScrubLabs = await createProduct('scrub-labs', 'Scrub Labs Scrub Set', catApparel.id, 20);
    const prodEFScrub = await createProduct('ef-scrub', 'EF Scrub Top', catApparel.id, 20);
    const prodLabCoat = await createProduct('tanc-labcoat', "TANC Dr's LabCoat", catOuterwear.id, 20);
    const prodDrsJacketLS = await createProduct('drs-jacket-ls', "Dr's Jacket (Long Sleeve)", catOuterwear.id, 18);
    const prodDrsJacketSS = await createProduct('drs-jacket-ss', "Dr's Jacket (Short Sleeve)", catOuterwear.id, 18);
    const prodSoftshellMen = await createProduct('softshell-men', 'Male Softshell Jacket', catOuterwear.id, 35);
    const prodSoftshellWomen = await createProduct('softshell-women', 'Female Softshell Jacket', catOuterwear.id, 35);
    const prodFlasks = await createProduct('podmyth-flasks', 'PodMYTH Black Thermos Flasks', catGear.id, 8);
    const prodPenTorch = await createProduct('pen-torch', 'Medical Pen Torch', catGear.id, 5);
    const prodLittmann = await createProduct('littmann-iii', 'Littmann Classic III Plum Stethoscope', catGear.id, 120);
    const prodBCTshirt = await createProduct('bc-campaign', 'Breast Cancer T-Shirt & Cap', catApparel.id, 10);
    const prodEmbroidery = await createProduct('embroidery', 'Custom Chest & Name Embroidery', catServices.id, 3, true);
    const prodNameTags = await createProduct('name-tags', 'Hospital Name Tags (Set of 3)', catServices.id, 3, true);
    const prodCourier = await createProduct('courier-delivery', 'Courier Delivery (Outside Harare)', catServices.id, 5, true);
    const prodHarareDel = await createProduct('harare-delivery', 'Harare CBD Delivery', catServices.id, 0, true);
    // ── Retail Shop Stock Control Sheet Inventory ($655.00 available stock) ───
    const shopStock = [
        { p: prodUnderScrubs, c: 'Navy Blue', s: 'M', buy: 12, sell: 20, qty: 1 },
        { p: prodEFScrub, c: 'Standard', s: 'M', buy: 12, sell: 20, qty: 1 },
        { p: prodTancLite, c: 'Petrol', s: 'M', buy: 22, sell: 35, qty: 1 },
        { p: prodTancCore, c: 'Charcoal Grey', s: 'XL', buy: 19, sell: 30, qty: 1 },
        { p: prodSoftshellMen, c: 'Black', s: 'M', buy: 22, sell: 35, qty: 1 },
        { p: prodSoftshellWomen, c: 'Black', s: 'M', buy: 22, sell: 35, qty: 1 },
        { p: prodTancLite, c: 'Black', s: 'S', buy: 22, sell: 35, qty: 1 },
        { p: prodUnderScrubs, c: 'Female Black', s: 'S', buy: 12, sell: 20, qty: 1 },
        { p: prodTancLite, c: 'Black', s: 'M', buy: 22, sell: 35, qty: 3 },
        { p: prodTancLite, c: 'Charcoal Grey', s: 'M', buy: 22, sell: 35, qty: 2 },
        { p: prodSoftshellMen, c: 'Black', s: 'S', buy: 22, sell: 35, qty: 1 },
        { p: prodDrsJacketLS, c: 'White', s: 'L', buy: 11, sell: 18, qty: 1 },
        { p: prodTancCore, c: 'Navy Blue', s: 'M', buy: 19, sell: 30, qty: 2 },
        { p: prodSoftshellMen, c: 'Navy Blue', s: 'M', buy: 22, sell: 35, qty: 1 },
        { p: prodTancCore, c: 'Black', s: 'XL', buy: 19, sell: 30, qty: 1 },
        { p: prodTancCore, c: 'Lilac', s: 'S', buy: 19, sell: 30, qty: 1 },
        { p: prodTancCore, c: 'Navy Blue', s: 'XL', buy: 19, sell: 30, qty: 1 },
        { p: prodTancCore, c: 'Black', s: 'L', buy: 19, sell: 30, qty: 3 },
        { p: prodTancCore, c: 'Powder Blue', s: 'M', buy: 19, sell: 30, qty: 1 },
        { p: prodLabCoat, c: 'White', s: 'L', buy: 13, sell: 20, qty: 1 },
        { p: prodDrsJacketSS, c: 'White', s: 'M', buy: 11, sell: 18, qty: 1 },
        { p: prodFlasks, c: 'Matte Black', s: 'Standard', buy: 4.5, sell: 8, qty: 2 },
        { p: prodLittmann, c: 'Plum', s: 'Standard', buy: 85, sell: 120, qty: 1 },
        { p: prodEmbroidery, c: 'N/A', s: 'N/A', buy: 1.5, sell: 3, qty: 999 },
        { p: prodNameTags, c: 'N/A', s: 'N/A', buy: 1, sell: 3, qty: 999 },
        { p: prodCourier, c: 'N/A', s: 'N/A', buy: 3.5, sell: 5, qty: 999 },
        { p: prodHarareDel, c: 'N/A', s: 'N/A', buy: 1.5, sell: 0, qty: 999 },
        { p: prodPenTorch, c: 'Silver/Black', s: 'Standard', buy: 2.5, sell: 5, qty: 5 },
    ];
    for (const item of shopStock) {
        await createVariant(item.p.id, item.c, item.s, item.buy, item.sell, item.qty);
    }
    // ── Authentic Clients ─────────────────────────────────────────────────────
    const clientData = [
        { id: 'c-dr-karie', name: 'Dr. Karie', phone: '+263 77 210 1122', city: 'Harare', deliveryZone: 'Parirenyatwa / CBD' },
        { id: 'c-kuziva', name: 'Kuziva Zvokuomba', phone: '+263 77 345 6789', city: 'Harare', deliveryZone: 'Avenues Clinic' },
        { id: 'c-st-john', name: 'St John Ambulance', phone: '+263 77 412 3456', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-dr-tawo', name: 'Dr. Tawo', phone: '+263 77 567 8901', city: 'Harare', deliveryZone: 'Harare Hospital' },
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
        { id: 'c-elijah', name: 'Elijah Dakwa', phone: '+263 77 345 6782', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-carol', name: 'Carol Moyo', phone: '+263 77 456 7893', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-noma', name: 'Noma', phone: '+263 77 567 8904', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-alista', name: 'Alista Marapira', phone: '+263 77 678 9015', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-caroline', name: 'Caroline Chinembiri', phone: '+263 77 789 0126', city: 'Harare', deliveryZone: 'CBD' },
        { id: 'c-dr-marisa', name: 'Dr. S. Marisa', phone: '+263 77 890 1237', city: 'Harare', deliveryZone: 'Private Practice' },
        { id: 'c-bester', name: 'Mrs. Bester', phone: '+263 77 901 2348', city: 'Harare', deliveryZone: 'CBD' },
    ];
    for (const c of clientData) {
        await prisma.client.create({ data: c });
    }
    // ── Helper to Create Real Sales Order ─────────────────────────────────────
    let invCounter = 1;
    async function createSale(params) {
        const num = params.refNumber || `PM-INV-2026-${String(invCounter++).padStart(3, '0')}`;
        const totalSell = params.items.reduce((s, it) => s + it.qty * it.sell, 0);
        const totalBuy = params.items.reduce((s, it) => s + it.qty * it.buy, 0);
        const netProfit = totalSell - totalBuy;
        const margin = totalSell > 0 ? (netProfit / totalSell) * 100 : 0;
        const paid = params.amountPaid !== undefined ? params.amountPaid : (params.status === 'PAID' ? totalSell : 0);
        const doc = await prisma.document.create({
            data: {
                refNumber: num,
                type: 'INVOICE',
                status: params.status,
                clientId: params.clientId,
                issueDate: new Date(params.date),
                paidDate: params.status === 'PAID' ? new Date(params.date) : null,
                paymentMethod: params.status === 'PAID' ? 'USD_CASH' : null,
                totalSellPrice: d(totalSell),
                totalBuyPrice: d(totalBuy),
                netProfit: d(netProfit),
                profitMargin: d(margin),
                amountPaid: d(paid),
                notes: params.notes,
                items: {
                    create: params.items.map((it, idx) => ({
                        description: it.desc,
                        qty: it.qty,
                        buyingPrice: d(it.buy),
                        sellingPrice: d(it.sell),
                        lineTotal: d(it.qty * it.sell),
                        lineCost: d(it.qty * it.buy),
                        lineProfit: d(it.qty * (it.sell - it.buy)),
                        sortOrder: idx,
                        notes: it.notes,
                    }))
                }
            }
        });
        if (paid > 0) {
            await prisma.payment.create({
                data: {
                    documentId: doc.id,
                    amount: d(paid),
                    method: 'USD_CASH',
                    paidAt: new Date(params.date),
                    notes: 'Customer receipt',
                }
            });
        }
        return doc;
    }
    // ── Authentic Sales from the PODMERCH Spreadsheet Ledger ───────────────────
    // 1. Dr Karie ($135.00 pending)
    await createSale({
        refNumber: 'PM-INV-2026-001',
        clientId: 'c-dr-karie',
        date: '2026-10-01',
        status: 'DELIVERED_PENDING',
        amountPaid: 0,
        notes: 'Outstanding payment $135.00',
        items: [
            { desc: 'TANC Core Scrub Set – Maroon / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Charcoal Grey / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'Female Softshell Jacket – Navy Blue / M', qty: 1, buy: 22, sell: 35 },
            { desc: 'Custom Chest & Name Embroidery', qty: 3, buy: 0, sell: 10, notes: 'Dr. Karie' },
        ]
    });
    // 2. Kuziva Zvokuomba ($45.00 pending: $10 advance paid)
    await createSale({
        refNumber: 'PM-INV-2026-002',
        clientId: 'c-kuziva',
        date: '2026-10-08',
        status: 'DELIVERED_PENDING',
        amountPaid: 10,
        notes: 'Outstanding payment $45.00 ($25 Softshell + $20 Labcoat balance)',
        items: [
            { desc: 'Male Softshell Jacket – Charcoal Grey / M', qty: 1, buy: 22, sell: 35, notes: '$10 advance paid, $25 balance due' },
            { desc: "TANC Dr's LabCoat – White / M", qty: 1, buy: 13, sell: 20, notes: '$20 balance due upon delivery' },
        ]
    });
    // 3. St John Ambulance ($30.00 pending: $30 paid for Petrol, $30 pending for Charcoal)
    await createSale({
        refNumber: 'PM-INV-2026-003',
        clientId: 'c-st-john',
        date: '2026-09-11',
        status: 'DELIVERED_PENDING',
        amountPaid: 30,
        notes: 'Outstanding payment $30.00 (Charcoal XS balance)',
        items: [
            { desc: 'TANC Core Scrub Set – Petrol / XS', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Charcoal / XS', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 4. Dr. Tawo ($2.00 pending: $20 paid, $2 balance)
    await createSale({
        refNumber: 'PM-INV-2026-004',
        clientId: 'c-dr-tawo',
        date: '2026-10-06',
        status: 'PARTIAL',
        amountPaid: 20,
        notes: 'Outstanding payment $2.00',
        items: [
            { desc: 'TANC Core Scrub Set – Navy Blue / L', qty: 1, buy: 19, sell: 20 },
            { desc: 'Custom Chest Embroidery', qty: 1, buy: 1, sell: 2, notes: 'Dr. Tawo' },
        ]
    });
    // 5. Dr. R. Rushwaya ($96.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-005',
        clientId: 'c-dr-rushwaya',
        date: '2026-09-10',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 20, sell: 32, notes: 'Embroidery' },
            { desc: 'TANC Core Scrub Set – Petrol / M', qty: 1, buy: 20, sell: 32, notes: 'Embroidery' },
            { desc: 'TANC Core Scrub Set – Brown / M', qty: 1, buy: 20, sell: 32, notes: 'Embroidery' },
        ]
    });
    // 6. Dominic Dube ($90.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-006',
        clientId: 'c-dominic',
        date: '2026-10-01',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Petrol / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'Male Softshell Jacket – Navy Blue / M', qty: 1, buy: 22, sell: 30 },
        ]
    });
    // 7. Kuzivakwashe Sunga ($40.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-007',
        clientId: 'c-kuzivakwashe',
        date: '2026-09-11',
        status: 'PAID',
        items: [
            { desc: 'Scrub Labs Scrub Set – Nicks Olive Green / L', qty: 1, buy: 10, sell: 20, notes: 'Embroidery' },
            { desc: 'UnderScrubs – Olive Green / M', qty: 1, buy: 10, sell: 20 },
        ]
    });
    // 8. Tanatswa Masungo ($35.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-008',
        clientId: 'c-tanatswa',
        date: '2026-09-11',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Navy Blue / M', qty: 1, buy: 20, sell: 35 },
        ]
    });
    // 9. Dr S Marisa ($14.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-009',
        clientId: 'c-dr-marisa',
        date: '2026-09-11',
        status: 'PAID',
        items: [
            { desc: 'Custom Order Embroidery (Scrubs + Stethoscope)', qty: 1, buy: 0, sell: 14 },
        ]
    });
    // 10. PodMYTH Flasks ($64.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-010',
        clientId: 'c-tafadzwa',
        date: '2026-09-12',
        status: 'PAID',
        items: [
            { desc: 'PodMYTH Black Thermos Flasks', qty: 8, buy: 36, sell: 64 },
        ]
    });
    // 11. Mrs Bester ($30.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-011',
        clientId: 'c-bester',
        date: '2026-09-15',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Baby Pink / 4XL', qty: 1, buy: 20, sell: 30 },
        ]
    });
    // 12. Tino Kambani ($85.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-012',
        clientId: 'c-tino',
        date: '2026-09-15',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Bottle Green / L', qty: 1, buy: 19, sell: 25 },
            { desc: 'TANC Core Scrub Set – Khaki / L', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Airforce Blue / L', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 13. Audrey ($26.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-013',
        clientId: 'c-audrey',
        date: '2026-09-17',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Standard / S', qty: 1, buy: 11, sell: 26, notes: 'Embroidery' },
        ]
    });
    // 14. Tafadzwa Labcoat ($20.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-014',
        clientId: 'c-tafadzwa',
        date: '2026-09-17',
        status: 'PAID',
        items: [
            { desc: "TANC Dr's LabCoat – White / XL", qty: 1, buy: 13, sell: 20 },
        ]
    });
    // 15. Doc Munashe ($60.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-015',
        clientId: 'c-doc-munashe',
        date: '2026-09-21',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 20, sell: 30 },
            { desc: 'TANC Core Scrub Set – Navy Blue / M', qty: 1, buy: 20, sell: 30 },
        ]
    });
    // 16. Katena Softshell ($35.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-016',
        clientId: 'c-katena',
        date: '2026-09-21',
        status: 'PAID',
        items: [
            { desc: 'Male Softshell Jacket – Black / L', qty: 1, buy: 20, sell: 35 },
        ]
    });
    // 17. Matiashe Short Sleeve Jacket ($15.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-017',
        clientId: 'c-matiashe',
        date: '2026-09-21',
        status: 'PAID',
        items: [
            { desc: "Dr's Jacket (Short Sleeve) – Standard / L", qty: 1, buy: 10, sell: 15 },
        ]
    });
    // 18. Russel Labcoat ($20.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-018',
        clientId: 'c-russel',
        date: '2026-09-22',
        status: 'PAID',
        items: [
            { desc: "TANC Dr's LabCoat – White / L", qty: 1, buy: 15, sell: 20 },
        ]
    });
    // 19. SamyKays ($60.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-019',
        clientId: 'c-samykays',
        date: '2026-09-25',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Navy Blue / L', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Navy Blue / XL', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 20. Vinia Machokoto ($32.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-020',
        clientId: 'c-vinia',
        date: '2026-09-28',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Navy Blue / M', qty: 1, buy: 19, sell: 32 },
        ]
    });
    // 21. MBChB IV ($30.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-021',
        clientId: 'c-mbchb-iv',
        date: '2026-09-29',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 22. Amanda Softshell ($40.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-022',
        clientId: 'c-amanda',
        date: '2026-09-29',
        status: 'PAID',
        items: [
            { desc: 'Female Softshell Jacket – Navy Blue / S', qty: 1, buy: 22, sell: 40 },
        ]
    });
    // 23. Kuziva Zvokuomba September Sets ($90.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-023',
        clientId: 'c-kuziva',
        date: '2026-09-30',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Charcoal Grey / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Core Scrub Set – Slate Grey / M', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 24. Shiloh ($30.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-024',
        clientId: 'c-shiloh',
        date: '2026-09-30',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Charcoal Grey / M', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 25. Ngonidzashe Zimbwa ($50.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-025',
        clientId: 'c-ngoni',
        date: '2026-09-30',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Charcoal Grey / M', qty: 1, buy: 19, sell: 30 },
            { desc: 'UnderScrubs – Black / S', qty: 1, buy: 12, sell: 20 },
        ]
    });
    // 26. Tunga ($30.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-026',
        clientId: 'c-tunga',
        date: '2026-10-01',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Charcoal Grey / M', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 27. Dineo ($36.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-027',
        clientId: 'c-dineo',
        date: '2026-10-01',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Powder Blue / L', qty: 1, buy: 12, sell: 18 },
            { desc: 'TANC Lite Scrub Set – Navy Blue / L', qty: 1, buy: 12, sell: 18 },
        ]
    });
    // 28. Dr Patie Labcoat ($20.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-028',
        clientId: 'c-dr-patie',
        date: '2026-10-05',
        status: 'PAID',
        items: [
            { desc: "TANC Dr's LabCoat – White / M", qty: 1, buy: 13, sell: 20 },
        ]
    });
    // 29. Nyasha Ndoro EF Scrub ($20.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-029',
        clientId: 'c-nyasha',
        date: '2026-10-05',
        status: 'PAID',
        items: [
            { desc: 'EF Scrub Top – Standard / XS', qty: 1, buy: 12, sell: 20 },
        ]
    });
    // 30. Tafadzwa Name Tags ($3.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-030',
        clientId: 'c-tafadzwa',
        date: '2026-10-05',
        status: 'PAID',
        items: [
            { desc: 'Hospital Name Tags (Set of 3)', qty: 1, buy: 1, sell: 3 },
        ]
    });
    // 31. Elijah Dakwa ($30.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-031',
        clientId: 'c-elijah',
        date: '2026-10-06',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Black / M', qty: 1, buy: 19, sell: 30 },
        ]
    });
    // 32. Carol Moyo Softshell ($35.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-032',
        clientId: 'c-carol',
        date: '2026-10-06',
        status: 'PAID',
        items: [
            { desc: 'Female Softshell Jacket – Black / S', qty: 1, buy: 22, sell: 35 },
        ]
    });
    // 33. Noma ($40.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-033',
        clientId: 'c-noma',
        date: '2026-10-07',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Navy Blue / S', qty: 1, buy: 22, sell: 40 },
        ]
    });
    // 34. Blessing Mabverengedze ($55.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-034',
        clientId: 'c-blessing',
        date: '2026-10-08',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Charcoal Grey / M', qty: 1, buy: 22, sell: 35 },
            { desc: 'UnderScrubs – White Male / M', qty: 1, buy: 12, sell: 20 },
        ]
    });
    // 35. Alista Marapira ($35.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-035',
        clientId: 'c-alista',
        date: '2026-10-08',
        status: 'PAID',
        items: [
            { desc: 'Male Softshell Jacket – Black / L', qty: 1, buy: 22, sell: 35 },
        ]
    });
    // 36. Shiloh October Sets ($65.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-036',
        clientId: 'c-shiloh',
        date: '2026-10-13',
        status: 'PAID',
        items: [
            { desc: 'TANC Core Scrub Set – Black / L', qty: 1, buy: 19, sell: 30 },
            { desc: 'TANC Lite Scrub Set – Raspberry / M', qty: 1, buy: 22, sell: 35 },
        ]
    });
    // 37. Tadiwa Makahamadze ($35.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-037',
        clientId: 'c-tadiwa',
        date: '2026-10-14',
        status: 'PAID',
        items: [
            { desc: 'Female Softshell Jacket – Standard / S', qty: 1, buy: 22, sell: 35 },
        ]
    });
    // 38. Dr. Chiwanga ($55.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-038',
        clientId: 'c-dr-chiwanga',
        date: '2026-10-15',
        status: 'PAID',
        items: [
            { desc: 'TANC Lite Scrub Set – Baby Pink / L', qty: 1, buy: 22, sell: 35 },
            { desc: 'UnderScrubs – White Female / M', qty: 1, buy: 12, sell: 20 },
        ]
    });
    // 39. Caroline Chinembiri ($10.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-039',
        clientId: 'c-caroline',
        date: '2026-10-15',
        status: 'PAID',
        items: [
            { desc: 'Breast Cancer T-Shirt & Cap – Pink / M', qty: 1, buy: 5, sell: 10 },
        ]
    });
    // 40. Pen Torch Sale ($5.00 paid)
    await createSale({
        refNumber: 'PM-INV-2026-040',
        clientId: 'c-dr-patie',
        date: '2026-10-18',
        status: 'PAID',
        items: [
            { desc: 'Medical Pen Torch – Diagnostic Gear', qty: 1, buy: 2.5, sell: 5 },
        ]
    });
    // Quotation: Mama K (3x TANC Core XL scrubs)
    await prisma.document.create({
        data: {
            refNumber: 'PM-QT-2026-001',
            type: 'QUOTATION',
            status: 'SENT',
            clientId: 'c-mama-k',
            issueDate: new Date('2026-10-01'),
            totalSellPrice: d(90),
            totalBuyPrice: d(57),
            netProfit: d(33),
            profitMargin: d(36.7),
            items: {
                create: [
                    { description: 'TANC Core Scrub Set – Navy Blue / XL', qty: 1, buyingPrice: d(19), sellingPrice: d(30), lineTotal: d(30), lineCost: d(19), lineProfit: d(11), sortOrder: 0 },
                    { description: 'TANC Core Scrub Set – Charcoal / XL', qty: 1, buyingPrice: d(19), sellingPrice: d(30), lineTotal: d(30), lineCost: d(19), lineProfit: d(11), sortOrder: 1 },
                    { description: 'TANC Core Scrub Set – Black / XL', qty: 1, buyingPrice: d(19), sellingPrice: d(30), lineTotal: d(30), lineCost: d(19), lineProfit: d(11), sortOrder: 2 },
                ]
            }
        }
    });
    // ── Authentic Expenses ────────────────────────────────────────────────────
    const authenticExpenses = [
        { category: 'REPAYMENT', description: 'WCN repayment (Short-term operational facility repayment)', amount: d(220), date: new Date('2026-10-25') },
        { category: 'TRANSPORT', description: 'Shawn – Delivery fuel & dispatch', amount: d(30), date: new Date('2026-10-22') },
        { category: 'OTHER', description: 'Merchant line payment (Card / POS terminal fee)', amount: d(50), date: new Date('2026-10-20') },
        { category: 'DOMAIN', description: 'Domain payment (podmyth.com / podmerch domain renewal)', amount: d(11), date: new Date('2026-10-15') },
        { category: 'EQUIPMENT', description: 'Lapel Mics for PodCast studio gear', amount: d(60), date: new Date('2026-09-05') },
        { category: 'MARKETING', description: 'Breast Cancer Campaign T-shirts & Certificates', amount: d(24), date: new Date('2026-09-12') },
        { category: 'LUNCH', description: 'PodMyth Strategic Meeting Lunch – RocoMamas', amount: d(60), date: new Date('2026-07-01') },
    ];
    for (const exp of authenticExpenses) {
        await prisma.expense.create({ data: exp });
    }
    // ── Action Points for /reconciliation ─────────────────────────────────────
    const actionPoints = [
        { title: 'Collect outstanding balance from Dr Karie', amount: d(135), category: 'COLLECT_CLIENT', person: 'Dr. Karie', status: 'PENDING', notes: '3x scrubs + jacket pending balance' },
        { title: 'Collect outstanding balance from Kuziva', amount: d(45), category: 'COLLECT_CLIENT', person: 'Kuziva Zvokuomba', status: 'PENDING', notes: 'Softshell ($25) + Labcoat ($20)' },
        { title: 'Collect outstanding payment from St John', amount: d(30), category: 'COLLECT_CLIENT', person: 'St John Ambulance', status: 'PENDING', notes: 'TANC Core Charcoal XS' },
        { title: 'Collect outstanding cash-in from Shawn', amount: d(25), category: 'CASH_IN', person: 'Shawn', status: 'PENDING', notes: 'Cash held by Shawn awaiting bank-in' },
        { title: 'Collect / cash-in outstanding funds from Genius', amount: d(10), category: 'CASH_IN', person: 'Genius Chipfupa', status: 'PENDING', notes: 'Cash held by Genius awaiting hand-over' },
        { title: 'Collect outstanding payment from Dr Tawo', amount: d(2), category: 'COLLECT_CLIENT', person: 'Dr. Tawo', status: 'PENDING', notes: 'Remaining balance on embroidered scrub set' },
        { title: 'Withdraw and cash in EcoCash funds', amount: d(48), category: 'WITHDRAWAL', person: 'EcoCash Merchant / Agent', status: 'PENDING', notes: 'Funds in EcoCash wallet awaiting cash-out into physical USD' },
        { title: 'Update physical stock records as items are sold', amount: d(0), category: 'OPERATIONAL', person: 'PodMyth Team', status: 'PENDING', notes: 'Synchronize retail shop stock control sheets' },
    ];
    for (const ap of actionPoints) {
        await prisma.actionPoint.create({ data: ap });
    }
    // ── Member Subscriptions ──────────────────────────────────────────────────
    const members = ['Tafadzwa S. Dhedheya', 'Nomqhele Shava (Nomu)', 'Genius Chipfupa', 'Shawn', 'Thembani Edmund'];
    const months = ['September', 'October', 'November', 'December'];
    for (const m of members) {
        for (const mo of months) {
            await prisma.memberSubscription.create({
                data: {
                    memberName: m,
                    month: mo,
                    year: 2026,
                    amount: d(10),
                    status: (mo === 'September' || mo === 'October') ? 'PAID' : 'PENDING',
                    notes: 'Monthly core PodMyth member contribution',
                }
            });
        }
    }
    console.log('Authentic PodMyth database seed completed successfully.');
}
exports.main = main;
if (require.main === module) {
    main()
        .catch(e => { console.error(e); process.exit(1); })
        .finally(() => prisma.$disconnect());
}
