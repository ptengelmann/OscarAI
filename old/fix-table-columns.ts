// Fix table columns to match Prisma schema exactly
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixTables() {
  console.log('🔧 Fixing table columns to match Prisma schema...\n')

  try {
    // Add missing columns to action_validation_rules
    console.log('→ Adding created_by column to action_validation_rules...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "action_validation_rules"
      ADD COLUMN IF NOT EXISTS "created_by" TEXT NOT NULL DEFAULT 'system'
    `)
    console.log('✅ Fixed action_validation_rules\n')

    // Add missing columns to action_batches
    console.log('→ Adding missing columns to action_batches...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "action_batches"
      ADD COLUMN IF NOT EXISTS "stop_on_error" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "estimated_duration" INTEGER,
      ADD COLUMN IF NOT EXISTS "actual_duration" INTEGER,
      ADD COLUMN IF NOT EXISTS "total_expected_impact" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "total_actual_impact" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "success_rate" DOUBLE PRECISION
    `)
    console.log('✅ Fixed action_batches\n')

    // Add missing columns to action_approvals
    console.log('→ Adding missing columns to action_approvals...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "action_approvals"
      ADD COLUMN IF NOT EXISTS "review_notes" TEXT,
      ADD COLUMN IF NOT EXISTS "notification_sent" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "notification_sent_at" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "reminder_count" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "last_reminder" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMP(3)
    `)
    console.log('✅ Fixed action_approvals\n')

    console.log('🎉 All tables fixed to match Prisma schema!')
    console.log('✅ Ready to test actions!')

  } catch (error) {
    console.error('❌ Error fixing tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixTables()
