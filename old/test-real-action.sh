#!/bin/bash
echo "🧪 Testing Real Action System (No Mocking!)"
echo ""
echo "Step 1: Check a real SKU price before action"
echo "----------------------------------------"
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.sku.findFirst({
  where: { user: { email: 'pedro@inventoryiq.com' } },
  select: { sku_code: true, name: true, price: true }
}).then(sku => {
  if (sku) {
    console.log('Found SKU:', sku.sku_code);
    console.log('Current price: £' + sku.price);
    console.log('Name:', sku.name);
  } else {
    console.log('No SKUs found for this user');
  }
}).finally(() => p.\$disconnect());
"

echo ""
echo "Step 2: You can now:"
echo "  - Go to dashboard and click [Execute] on an action"
echo "  - The price WILL update in your database"
echo "  - Check actions table to see audit trail"
echo ""
echo "Step 3: Verify action was logged"
echo "----------------------------------------"
echo "Run: npx tsx -e \"import { PrismaClient } from '@prisma/client'; const p = new PrismaClient(); p.action.findMany({ take: 3, orderBy: { initiated_at: 'desc' } }).then(console.log).finally(() => p.\$disconnect());\""
