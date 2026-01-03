// Create action tables using Prisma executeRaw
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTables() {
  console.log('🔨 Creating Enterprise Action System tables...\n')

  try {
    // Table 1: Actions
    console.log('→ Creating actions table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "actions" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "action_type" TEXT NOT NULL,
        "target_sku" TEXT,
        "target_skus" JSONB,
        "action_payload" JSONB NOT NULL,
        "reason" TEXT NOT NULL,
        "expected_impact" DOUBLE PRECISION,
        "confidence_score" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "initiated_by" TEXT NOT NULL,
        "initiated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "validated_at" TIMESTAMP(3),
        "executed_at" TIMESTAMP(3),
        "completed_at" TIMESTAMP(3),
        "requires_approval" BOOLEAN NOT NULL DEFAULT false,
        "approved_by" TEXT,
        "approved_at" TIMESTAMP(3),
        "actual_impact" DOUBLE PRECISION,
        "success_metrics" JSONB,
        "error_message" TEXT,
        "rollback_data" JSONB NOT NULL,
        "rolled_back" BOOLEAN NOT NULL DEFAULT false,
        "rolled_back_at" TIMESTAMP(3),
        "rolled_back_by" TEXT,
        "external_refs" JSONB,
        "affected_systems" TEXT[],
        "sync_status" JSONB,
        "batch_id" TEXT
      )
    `)
    console.log('✅ actions table created\n')

    // Table 2: Action Validation Rules
    console.log('→ Creating action_validation_rules table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "action_validation_rules" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "action_type" TEXT NOT NULL,
        "rule_type" TEXT NOT NULL,
        "rule_config" JSONB NOT NULL,
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ action_validation_rules table created\n')

    // Table 3: Action Batches
    console.log('→ Creating action_batches table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "action_batches" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "user_id" TEXT NOT NULL,
        "batch_name" TEXT NOT NULL,
        "batch_type" TEXT NOT NULL,
        "action_ids" TEXT[],
        "total_actions" INTEGER NOT NULL,
        "completed" INTEGER NOT NULL DEFAULT 0,
        "failed" INTEGER NOT NULL DEFAULT 0,
        "pending" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "execute_parallel" BOOLEAN NOT NULL DEFAULT false,
        "max_concurrent" INTEGER NOT NULL DEFAULT 5,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "started_at" TIMESTAMP(3),
        "completed_at" TIMESTAMP(3)
      )
    `)
    console.log('✅ action_batches table created\n')

    // Table 4: Action Approvals
    console.log('→ Creating action_approvals table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "action_approvals" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "action_id" TEXT NOT NULL UNIQUE,
        "requester_id" TEXT NOT NULL,
        "approver_id" TEXT,
        "approval_status" TEXT NOT NULL DEFAULT 'pending',
        "approval_reason" TEXT NOT NULL,
        "risk_level" TEXT NOT NULL,
        "estimated_impact" DOUBLE PRECISION,
        "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewed_at" TIMESTAMP(3),
        "auto_approved" BOOLEAN NOT NULL DEFAULT false
      )
    `)
    console.log('✅ action_approvals table created\n')

    // Create indexes
    console.log('→ Creating indexes...')
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "actions_user_id_idx" ON "actions"("user_id")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "actions_status_idx" ON "actions"("status")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "actions_action_type_idx" ON "actions"("action_type")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "action_validation_rules_user_id_idx" ON "action_validation_rules"("user_id")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "action_batches_user_id_idx" ON "action_batches"("user_id")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "action_approvals_action_id_idx" ON "action_approvals"("action_id")`)
    console.log('✅ Indexes created\n')

    console.log('🎉 Enterprise Action System tables created successfully!')
    console.log('\n✅ Ready to execute actions!')

  } catch (error) {
    console.error('❌ Error creating tables:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTables()
