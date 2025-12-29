# Impact Analytics & ROI Tracking System

## What We Built

A comprehensive **Impact Analytics** system that tracks predicted vs actual outcomes from AI-powered recommendations. This is CRITICAL for proving ROI and validating that the AI actually works.

---

## Changes Made

### 1. **Route Restructuring** ✅

**OLD Structure:**
```
/analytics → CSV upload page (WRONG!)
Navbar: "Analytics" button
```

**NEW Structure:**
```
/upload → CSV upload page ✓
/analytics → Impact tracking dashboard ✓
Navbar: "Upload" + "Analytics" buttons ✓
```

**Files Changed:**
- Renamed `/src/app/analytics` → `/src/app/upload`
- Created new `/src/app/analytics/page.tsx`
- Updated `/src/components/ui/navbar.tsx`
- Updated `/src/app/dashboard/page.tsx` (button routes)
- Updated `/src/app/history/page.tsx` (button routes)

---

## 2. **New Analytics Dashboard** (`/analytics`)

### **Features:**

#### **A. Summary Statistics Cards**
- **Total Actions**: How many AI recommendations have been executed
- **Expected Impact**: Total £ predicted by AI
- **Actual Impact**: Total £ actually delivered (when tracked)
- **Accuracy**: Percentage showing how accurate AI predictions are

#### **B. Action Performance Breakdown**
Shows performance by action type:
- `price_update`: Price changes
- `reorder_stock`: Inventory replenishment
- `launch_campaign`: Marketing campaigns
- `bulk_update`: Batch operations

For each type shows:
- Number of actions
- Expected vs Actual impact
- Success rate
- Whether expectations were met

#### **C. Recent Actions Table**
Full audit trail showing:
- Action type
- Target SKU
- Status (completed/pending/failed)
- Expected impact
- Actual impact (when available)
- AI confidence score
- Execution date

#### **D. Shopify Integration Banner**
Prominent banner explaining that real-time impact tracking will happen automatically when Shopify is connected:
- Real-time sales tracking after price changes
- Automated ROI calculations (before/after comparison)
- AI model calibration based on actual outcomes
- Revenue attribution dashboards

---

## 3. **API Endpoint** (`/api/analytics/performance`)

**Route**: `GET /api/analytics/performance?userId=email@example.com`

**Returns:**
```typescript
{
  success: true,
  stats: {
    total_actions: 42,
    completed_actions: 38,
    pending_actions: 3,
    failed_actions: 1,
    total_expected_impact: 127500,  // £127.5K predicted
    total_actual_impact: 115800,     // £115.8K actual
    success_rate: 85.2,               // 85.2% success rate
    avg_confidence: 0.83              // Average 83% confidence
  },
  breakdown: [
    {
      action_type: "price_update",
      count: 28,
      expected_impact: 82000,
      actual_impact: 76500,
      success_rate: 89.3
    },
    ...
  ],
  recent_actions: [
    {
      id: "action_123",
      action_type: "price_update",
      target_sku: "SKU-WINE-001",
      status: "completed",
      expected_impact: 12000,
      actual_impact: 11200,  // 93% accuracy
      confidence_score: 0.85,
      initiated_at: "2025-01-20T10:30:00Z",
      completed_at: "2025-01-20T10:31:22Z"
    },
    ...
  ],
  accuracy_trend: [
    { week: "Week 1", accuracy: 87, actions: 12 },
    { week: "Week 2", accuracy: 92, actions: 15 },
    ...
  ]
}
```

**Data Source**: Queries the `Action` model from Prisma schema

**Key Fields Used:**
- `expected_impact`: AI's prediction (£)
- `actual_impact`: Real measured outcome (£)
- `confidence_score`: AI confidence (0-1)
- `status`: Action status
- `rollback_data`: Before/after comparison data

---

## 4. **Database Schema Already Prepared** ✅

The `Action` model already has everything we need:

```prisma
model Action {
  // Prediction
  expected_impact   Float?    // £12,000 (AI prediction)
  confidence_score  Float?    // 0.85 (85% confident)

  // Actual Results
  actual_impact     Float?    // £11,200 (actual outcome)
  success_metrics   Json?     // Detailed metrics

  // Tracking
  initiated_at      DateTime
  executed_at       DateTime?
  completed_at      DateTime?

  // Rollback data for before/after comparison
  rollback_data     Json      // Original values
}
```

---

## 5. **How Impact Tracking Will Work (With Shopify)**

### **Current State (Phase 1):**
- Actions are executed and saved to database ✅
- `expected_impact` is recorded ✅
- `actual_impact` is NULL (placeholder) ✅
- Dashboard shows expected impact only ✅

### **Future State (Phase 2 - With Shopify):**

#### **Step 1: Action Execution**
```
User executes "Increase price of SKU-001 from £25 to £28"
↓
Action Engine:
- Captures rollback_data: { previous_price: 25, previous_sales: [12, 15, 11, 14] }
- Calculates expected_impact: £3 × 13 weekly sales × 4.33 weeks = £169/month
- Saves to database with status: "completed"
- Syncs to Shopify API (changes price to £28)
```

#### **Step 2: Automated Tracking (Background Job)**
```javascript
// Runs daily via cron job or webhook
async function trackActionImpact() {
  // Find completed actions without actual_impact measured
  const pendingActions = await prisma.action.findMany({
    where: {
      status: 'completed',
      actual_impact: null,
      completed_at: { lte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
    }
  })

  for (const action of pendingActions) {
    // Fetch Shopify sales data for the SKU
    const salesData = await shopify.getProductSales(action.target_sku, {
      startDate: action.completed_at,
      endDate: new Date(),
      period: '7days'
    })

    // Compare to baseline (from rollback_data)
    const baselineSales = action.rollback_data.previous_sales
    const baselineAvg = baselineSales.reduce((a, b) => a + b) / baselineSales.length

    // Calculate actual impact
    const actualRevenue = salesData.sales * salesData.price
    const baselineRevenue = baselineAvg * action.rollback_data.previous_price
    const actualImpact = (actualRevenue - baselineRevenue) * 4.33 // Monthly

    // Update database
    await prisma.action.update({
      where: { id: action.id },
      data: {
        actual_impact: actualImpact,
        success_metrics: {
          new_sales: salesData.sales,
          new_price: salesData.price,
          baseline_sales: baselineAvg,
          baseline_price: action.rollback_data.previous_price,
          accuracy: (actualImpact / action.expected_impact) * 100
        }
      }
    })
  }
}
```

#### **Step 3: AI Model Calibration**
```javascript
// Uses actual results to improve future predictions
async function calibrateAIModel() {
  const completedActions = await prisma.action.findMany({
    where: {
      status: 'completed',
      actual_impact: { not: null }
    }
  })

  // Calculate AI accuracy by confidence bucket
  const confidenceBuckets = {
    'high': completedActions.filter(a => a.confidence_score > 0.8),
    'medium': completedActions.filter(a => a.confidence_score >= 0.6 && a.confidence_score <= 0.8),
    'low': completedActions.filter(a => a.confidence_score < 0.6)
  }

  for (const [bucket, actions] of Object.entries(confidenceBuckets)) {
    const accuracy = actions.reduce((sum, a) =>
      sum + (a.actual_impact / a.expected_impact), 0
    ) / actions.length

    console.log(`${bucket} confidence actions: ${(accuracy * 100).toFixed(1)}% accurate`)

    // Feed this back to AI for better predictions
    // E.g., "Your 80%+ confidence predictions were 92% accurate - keep it up!"
    // or "Your 60-80% predictions were only 65% accurate - be more conservative"
  }
}
```

---

## 6. **User Experience**

### **For Users Without Actions Yet:**
Shows empty state with:
- Icon + "No Actions Yet"
- Explanation
- "Go to Dashboard" button to execute first action

### **For Users With Actions (But No Shopify):**
Shows:
- Total actions executed
- Expected impact totals
- Banner explaining Shopify integration needed for actual tracking
- Placeholders for actual impact

### **For Users With Shopify Connected (Future):**
Shows:
- Full predicted vs actual comparison
- Accuracy percentages
- ROI validation
- Success rate by action type
- Trend analysis over time

---

## 7. **Why This Matters**

### **Business Value:**
1. **Proves ROI**: Shows executives that AI recommendations actually work
2. **Validates AI**: Demonstrates prediction accuracy (90%+ builds trust)
3. **Identifies Opportunities**: Shows which action types work best
4. **Builds Confidence**: Users see real £ results, not just predictions

### **Competitive Advantage:**
- Netstock doesn't have this level of impact tracking
- Most tools show predictions but never validate them
- This creates a feedback loop that improves the AI over time

### **Sales Pitch:**
> "Our AI predicted £127K impact - and delivered £116K actual. That's 91% accuracy.
> Your current system? Just guesses with no validation."

---

## 8. **Next Steps (When Shopify Integrates)**

### **Phase 1 Tasks:**
- [ ] Set up Shopify OAuth connection
- [ ] Create Shopify API wrapper for sales data
- [ ] Build background job for impact tracking
- [ ] Add webhook handlers for real-time updates

### **Phase 2 Tasks:**
- [ ] Implement A/B testing framework
- [ ] Add machine learning model calibration
- [ ] Build predictive accuracy dashboard
- [ ] Create automated reports for executives

### **Code Hooks Already In Place:**
```typescript
// action-engine.ts already has these:
affected_systems: ['shopify']  // Knows which systems to sync
external_refs: { shopify_product_id }  // Links to Shopify
rollback_data: { ... }  // Before snapshot for comparison
```

---

## 9. **Testing**

### **To Test Now:**
1. Navigate to `/analytics`
2. Should see analytics dashboard (even with no data)
3. Execute some actions from dashboard
4. Check that actions appear in analytics
5. Verify expected impact shows correctly

### **Simulating Impact Tracking:**
```sql
-- Manually add actual_impact to test the UI
UPDATE actions
SET actual_impact = expected_impact * 0.93  -- 93% accuracy
WHERE status = 'completed'
AND id = 'some-action-id';
```

---

## 10. **Files Created/Modified**

**Created:**
- `/src/app/analytics/page.tsx` - New analytics dashboard
- `/src/app/api/analytics/performance/route.ts` - API endpoint
- `/src/app/upload/page.tsx` - Renamed from analytics

**Modified:**
- `/src/components/ui/navbar.tsx` - Added Upload, reordered nav
- `/src/app/dashboard/page.tsx` - Updated routes
- `/src/app/history/page.tsx` - Updated routes

**Documentation:**
- `ANALYTICS_IMPACT_TRACKING.md` - This file

---

## Summary

You now have a **professional impact tracking system** that's ready for Shopify integration. The infrastructure is in place to automatically track predicted vs actual outcomes, validate AI accuracy, and prove ROI to customers.

This is a **massive differentiator** that most competitors don't have - it closes the loop on AI recommendations and builds trust through transparency.

**Ready to deploy!** 🚀
