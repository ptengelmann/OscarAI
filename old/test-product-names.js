// Test script to check product names and test SERP scraping
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testProductNames() {
  try {
    console.log('🔍 Fetching top 10 products from inventory...\n')

    const products = await prisma.inventory.findMany({
      where: {
        user_id: 'pedro@inventoryiq.com'
      },
      orderBy: {
        price: 'desc'
      },
      take: 10,
      select: {
        sku_code: true,
        product_name: true,
        price: true,
        category: true
      }
    })

    console.log(`Found ${products.length} products:\n`)

    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.product_name}`)
      console.log(`   SKU: ${product.sku_code}`)
      console.log(`   Price: £${product.price}`)
      console.log(`   Category: ${product.category || 'N/A'}`)
      console.log('')
    })

    // Test SERP API with first 3 products
    if (products.length > 0) {
      for (let i = 0; i < Math.min(3, products.length); i++) {
        const testProduct = products[i]
        console.log(`\n🧪 Test ${i + 1}: Testing SERP API with: "${testProduct.product_name}"\n`)

        const queryParams = new URLSearchParams({
          product: testProduct.product_name,
          category: testProduct.category || 'alcohol',
          maxRetailers: '5',
          userId: 'pedro@inventoryiq.com',
          userEmail: 'pedro@inventoryiq.com'
        })

        const apiUrl = `http://localhost:3000/api/competitors/live?${queryParams.toString()}`

        const response = await fetch(apiUrl)
        const data = await response.json()

        if (data.success && data.competitors && data.competitors.length > 0) {
          console.log(`✅ Found ${data.competitors.length} competitors:`)
          data.competitors.forEach(comp => {
            console.log(`   - ${comp.retailer}: £${comp.price} (${comp.product_name})`)
          })
        } else {
          console.log(`❌ No competitors found`)
          console.log(`   Response:`, JSON.stringify(data, null, 2))
        }

        // Wait 2 seconds between requests
        if (i < Math.min(3, products.length) - 1) {
          console.log(`\n⏳ Waiting 2 seconds before next request...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    // Check competitor_price table
    console.log(`\n\n📊 Checking competitor_price table...`)
    const competitorCount = await prisma.competitorPrice.count({
      where: {
        user_id: 'pedro@inventoryiq.com'
      }
    })
    console.log(`Found ${competitorCount} competitor price records in database`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testProductNames()
