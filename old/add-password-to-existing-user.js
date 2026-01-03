// add-password-to-existing-user.js
// Quick script to add password to existing users

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function addPasswordToUser() {
  const email = 'c1@gmail.com' // Change this to your email
  const password = 'Password123' // Change this to your desired password

  try {
    console.log(`\n🔐 Adding password to user: ${email}`)

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log(`❌ User ${email} not found`)
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name}`)

    // Hash password
    console.log('🔒 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })

    console.log(`✅ Password added successfully!`)
    console.log(`\nYou can now login with:`)
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    console.log(`\n⚠️  Make sure to change this password after logging in!\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

addPasswordToUser()