# Shopify Analytics 

A full-stack analytics platform for Shopify merchants that provides actionable insights, root-cause analysis, and smart recommendations.

## Key Features

### Root-Cause Analysis Engine
- **Deterministic logic** that explains WHY revenue changed month-over-month
- Analyzes 6 key metrics: Revenue, Orders, AOV, Returning Customers, Conversion Rate, Shipping Time
  
### Smart Alerts System
- Proactive notifications for critical business metrics
- Severity-based prioritization
- Actionable recommendations

### Multi-Store Management
- Connect and manage multiple Shopify stores
- OAuth integration for secure store connection
- Individual analytics dashboards per store

### Dual Authentication
- Traditional email/password login
- Google OAuth sign-in
- Seamless account linking

### Comprehensive Analytics
- 24-month revenue trends with interactive charts
- Month-over-month comparisons
- Top products, categories, and customer insights
- Seasonal analysis and forecasting

## Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Passport.js (Local + Google OAuth)
- Shopify API (@shopify/shopify-api)

**Frontend:**
- EJS templating
- Chart.js for visualizations
- Vanilla JavaScript

**Infrastructure:**
- Session management with MongoDB store
- Environment-based configuration

## Project Structure

```
shopify-analytics-saas/
├── backend/
│   ├── config/
│   │   ├── passport.js          # Authentication strategies
│   │   └── shopify.js            # Shopify API configuration
│   ├── middleware/
│   │   └── auth.js               # Authentication middleware
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Store.js              # Store schema
│   │   ├── Order.js              # Order schema
│   │   └── Report.js             # Report schema with root causes
│   ├── routes/
│   │   ├── authRoutes.js         # Auth endpoints
│   │   ├── dashboardRoutes.js    # Dashboard endpoints
│   │   └── shopifyRoutes.js      # Shopify OAuth endpoints
│   ├── utils/
│   │   ├── rootCauseEngine.js    # Root-cause analysis logic
│   │   ├── alertEngine.js        # Smart alerts generation
│   │   ├── seasonalAnalysis.js   # Seasonal pattern detection
│   │   └── shopifySync.js        # Shopify data sync
│   ├── scripts/
│   │   ├── checkDatabase.js      # Database inspection
│   │   ├── checkRootCauses.js    # Root-cause verification
│   │   └── regenerateReportsWithRootCauses.js
│   ├── seed/
│   │   └── seed.js               # Database seeding
│   └── src/
│       └── server.js             # Express app entry point
├── views/
│   ├── dashboard.ejs             # Main dashboard
│   ├── store-analytics.ejs       # Store analytics page
│   ├── login.ejs                 # Login page
│   ├── register.ejs              # Registration page
│   ├── add-store.ejs             # Add store page
│   └── ads.ejs                   # Ad campaign manager
├── public/
│   ├── css/
│   │   ├── style.css             # Main styles
│   │   └── auth.css              # Auth page styles
│   └── js/
│       └── main.js               # Frontend JavaScript
├── .env.example                  # Environment template
├── .gitignore
└── package.json
```

## Installation

### Prerequisites
- Node.js 16+
- MongoDB (local or Atlas)
- Google Cloud account (for Google OAuth)
- Shopify Partner account (for Shopify OAuth)

### Setup

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd shopify-analytics-saas
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
PORT=5001

SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
HOST=localhost:5001
NODE_ENV=development

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

SESSION_SECRET=your_random_session_secret
```

4. **Seed the database (optional)**
```bash
npm run seed
```

5. **Start the server**
```bash
npm run dev
```

6. **Access the application**
```
http://localhost:5001
```

## Configuration Guides

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:5001/auth/google/callback`
5. Copy Client ID and Client Secret to `.env`

### Shopify OAuth Setup

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Create a custom app
3. Configure:
   - App URL: `http://localhost:5001`
   - Redirect URL: `http://localhost:5001/auth/shopify/callback`
4. Select scopes:
   - `read_orders`
   - `read_products`
   - `read_customers`
   - `read_analytics`
   - `read_inventory`
5. Copy API key and secret to `.env`

## Usage

### For Development

**Login Credentials (after seeding):**
- Email: `alex@shopifyanalytics.com`
- Password: `12345`

**Available Scripts:**
```bash
npm run dev              # Start development server
npm run seed             # Seed database with test data
node backend/scripts/checkDatabase.js        # Inspect database
node backend/scripts/checkRootCauses.js      # Verify root causes
```

### Adding a Store

1. Login to the dashboard
2. Click "Add Store"
3. Choose connection method:
   - **OAuth**: Enter store name and click "Connect with Shopify"
   - **Manual**: Enter store details and access token directly

### Viewing Analytics

1. Navigate to dashboard
2. Click on any store card
3. View:
   - Revenue trends (24 months)
   - Root-cause analysis (month-over-month)
   - Smart alerts
   - Action items
   - Top products and categories

## Core Features Explained

### Root-Cause Analysis

The root-cause engine analyzes 6 metrics with weighted impact:

| Metric | Weight | Threshold |
|--------|--------|-----------|
| Revenue | 1.0 | ≥5% |
| Orders | 0.9 | ≥5% |
| AOV | 0.8 | ≥5% |
| Returning Customers | 0.85 | ≥5% |
| Conversion Rate | 0.7 | ≥5% |
| Shipping Time | 0.5 | ≥10% |

**Example Output:**
```
Revenue dropped by 18.0% compared to last month
- Average order value declined by 18.0% - customers spending less per order
- Fewer repeat customers - returning customer rate fell by 28.0%
```

### Smart Alerts

Automatically generated alerts for:
- Significant revenue changes
- AOV fluctuations
- Customer retention issues
- Conversion rate drops
- Operational bottlenecks

### Data Models

**Report Schema:**
```javascript
{
  store: ObjectId,
  month: Number,
  year: Number,
  data: {
    revenue: Number,
    aov: Number,
    returningCustomerRate: Number,
    conversionRate: Number,
    avgShippingTime: Number,
    topProduct: Object,
    topCategories: Array,
    recommendations: Array
  },
  rootCauses: [{
    metric: String,
    change: Number,
    changePercent: Number,
    impact: String,      // "High", "Medium", "Low"
    explanation: String,
    direction: String    // "up", "down"
  }],
  alerts: Array
}
```

## Security

- Password hashing with bcryptjs
- Session-based authentication
- MongoDB session store
- HTTPS enforcement in production
- OAuth 2.0 for third-party auth
- Read-only Shopify API scopes
- Environment-based secrets

## Deployment

### Environment Variables for Production

```env
MONGO_URI=your_production_mongodb_uri
PORT=5001
NODE_ENV=production
HOST=yourdomain.com

SHOPIFY_API_KEY=production_api_key
SHOPIFY_API_SECRET=production_api_secret

GOOGLE_CLIENT_ID=production_client_id
GOOGLE_CLIENT_SECRET=production_client_secret

SESSION_SECRET=strong_random_secret
```

### Production Checklist

- [ ] Update OAuth redirect URLs for production domain
- [ ] Enable HTTPS
- [ ] Set strong SESSION_SECRET
- [ ] Configure MongoDB Atlas (production cluster)
- [ ] Set up monitoring and logging
- [ ] Enable rate limiting
- [ ] Add error tracking (Sentry, etc.)

## API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Login submission
- `GET /auth/register` - Registration page
- `POST /auth/register` - Registration submission
- `GET /auth/google` - Google OAuth
- `GET /auth/google/callback` - Google OAuth callback
- `GET /auth/logout` - Logout

### Dashboard
- `GET /dashboard` - Main dashboard
- `GET /dashboard/add` - Add store page
- `POST /dashboard/add` - Create store
- `GET /dashboard/:id` - Store analytics
- `DELETE /dashboard/:id` - Delete store

### Shopify
- `GET /auth/shopify` - Shopify OAuth
- `GET /auth/shopify/callback` - Shopify OAuth callback

---

# AI Insights System

## Overview

An enterprise-grade AI layer that transforms your deterministic analytics into business-friendly insights and recommendations.

**Key Principle:** AI augments your analytics, never replaces them. Your deterministic engine remains the source of truth.

## Quick Start

### 1. Verify Setup
```bash
npm run ai:setup
```

### 2. Test System (Mock Mode - No Costs)
```bash
npm run ai:test
```

### 3. Start Server
```bash
npm run dev
```

## Current Status: MOCK MODE

The AI system is **fully installed and working** in mock mode:
- All API endpoints functional
- Full pipeline working
- Zero costs (mock responses)
- Perfect for testing

**API Key in .env:**
```env
# FAKE API KEY - Replace with your actual OpenAI API key
# Get your key at: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-fake-key-replace-with-your-actual-openai-api-key-1234567890
```

## Architecture

### Two-Layer AI Design
```
Generator LLM → Creates insights from analytics
      ↓
Evaluator LLM → Scores quality (0-10), detects hallucination
      ↓
Decision: Pass (≥8) | Retry (6-7.9) | Fallback (<6)
```

### Data Flow
```
Your Analytics → AI Context (~1500 tokens) → Generator → Evaluator → Database
```

### Files Structure
```
backend/ai/
├── orchestrator.js      - Main coordinator
├── generator.js         - Creates insights
├── evaluator.js         - Quality judge
├── contextBuilder.js    - Data transformer
├── config.js            - Cost & quality control
├── types.js             - Type definitions
├── setup.js             - Verification script
├── test.js              - Test suite
└── .env.example         - Config template

backend/models/AIReport.js  - Database model
backend/routes/aiRoutes.js  - 8 API endpoints
```

## AI API Endpoints

```bash
# Get AI report (cached if fresh)
GET /api/ai/report/:storeId/:year/:month

# Force regenerate
POST /api/ai/regenerate/:storeId/:year/:month

# Get all reports for store
GET /api/ai/reports/:storeId

# Quality statistics
GET /api/ai/stats/:storeId

# Cost estimate
GET /api/ai/estimate/:storeId/:year/:month

# User feedback
POST /api/ai/feedback/:reportId

# Batch generate (up to 12)
POST /api/ai/batch-generate/:storeId
```

## Configuration

All AI settings in `.env`:

```env
# Feature Flags
AI_ENABLED=true
AI_AUTO_GENERATE=false       # Manual generation only
AI_BATCH_ENABLED=false       # Disable batch endpoints
AI_USE_FALLBACK=true         # Always fallback on error

# Models
AI_GENERATOR_MODEL=gpt-4o
AI_EVALUATOR_MODEL=gpt-4o-mini
AI_GENERATOR_TEMPERATURE=0.3

# Cost Control
AI_MAX_COST_PER_REPORT=0.10
AI_MAX_MONTHLY_COST=100
AI_MAX_RETRIES=1
AI_MAX_REPORTS_PER_HOUR=60

# Quality
AI_PASS_SCORE=8.0           # Minimum to accept
AI_RETRY_SCORE=6.0          # Minimum to retry
AI_CACHE_MAX_AGE_DAYS=30
```

## Safety Features

### Cost Protection
- Per-report limit: $0.10
- Monthly budget: $100
- Rate limiting: 60/hour
- Max retries: 1
- Auto-alerts at 80% budget

### Quality Assurance
- LLM Judge scores every output (0-10)
- Pass threshold: 8.0/10
- Auto-retry if score 6.0-7.9
- Fallback to deterministic if < 6.0
- Rule-based validation

### Never Fails
- Deterministic fallback always available
- Uses your existing analytics
- Zero hallucination risk
- Graceful degradation

## Enabling Real AI (When Ready)

### Step 1: Get API Key
Visit: https://platform.openai.com/api-keys

### Step 2: Update .env
Replace fake key with real key

### Step 3: Enable API Calls

**File 1: `backend/ai/generator.js` (line ~165)**
```javascript
// Uncomment this block:
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const response = await openai.chat.completions.create({
  model: config.model,
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  temperature: config.temperature,
  max_tokens: config.maxTokens,
  response_format: { type: "json_object" }
});

return response.choices[0].message.content;
```

**File 2: `backend/ai/evaluator.js` (line ~145)**
Same pattern - uncomment real API call

### Step 4: Test
```bash
npm run ai:test  # Now makes real API calls
```

## Cost Estimates (When Live)

| Volume | Monthly Cost |
|--------|--------------|
| 50 reports | $1 - $2.50 |
| 100 reports | $2 - $5 |
| 500 reports | $10 - $25 |
| 1000 reports | $20 - $50 |

**Per report:** ~$0.02 - $0.03 (GPT-4o)

## Example Output

### AI Request
```bash
GET /api/ai/report/507f1f77bcf86cd799439011/2024/3
```

### AI Response
```json
{
  "report": {
    "summary": "March 2024 showed strong performance with revenue increasing 15.3% month-over-month. The primary driver was improved AOV (+18%), though returning customer rates declined slightly. Store should focus on retention while capitalizing on increased spending patterns.",
    "insights": [
      {
        "title": "Revenue Growth Driven by Higher AOV",
        "explanation": "While order volume remained stable, the 18% increase in average order value directly contributed to revenue growth.",
        "severity": "high",
        "relatedMetrics": ["Revenue", "AOV"]
      }
    ],
    "actions": [
      {
        "action": "Implement abandoned cart email sequence",
        "reason": "Based on $6,200 in abandoned carts with 20% recovery rate",
        "impact": "$1,240 estimated recovery",
        "effort": "low",
        "timeframe": "immediate"
      }
    ]
  },
  "evaluation": {
    "score": 8.7,
    "pass": true,
    "breakdown": {
      "accuracy": 9,
      "specificity": 8,
      "actionability": 9,
      "businessValue": 9
    }
  }
}
```

## Usage Patterns

### Pattern 1: On-Demand (Recommended)
```javascript
// Frontend button click
const response = await fetch(`/api/ai/report/${storeId}/${year}/${month}`);
```

### Pattern 2: Auto-Generate
```javascript
// After monthly report completes
import { generateAIReport } from "./ai/orchestrator.js";

if (AI_FEATURES.autoGenerate) {
  await generateAIReport(storeId, month, year);
}
```

### Pattern 3: Batch Backfill
```javascript
// Weekly cron job
import { batchGenerateReports } from "./ai/orchestrator.js";

await batchGenerateReports(storeId, [
  {month: 1, year: 2024},
  {month: 2, year: 2024}
]);
```

## Monitoring

### Check Stats
```javascript
const stats = await AIReport.getQualityStats(storeId);
// { averageScore: "8.5", passRate: "87%", fallbackRate: "13%" }
```

### Check Costs
```javascript
import { rateLimiter } from "./ai/config.js";
const stats = rateLimiter.getStats();
// { costThisMonth: 23.45, budgetRemaining: 76.55 }
```

## Troubleshooting

### "AI reports always use fallback"
- Check OPENAI_API_KEY is set
- Verify real API calls uncommented in generator.js and evaluator.js
- Check AI_ENABLED=true

### "Costs too high"
- Lower AI_MAX_RETRIES=0
- Use smaller model: AI_GENERATOR_MODEL=gpt-4o-mini
- Reduce AI_GENERATOR_MAX_TOKENS=800
- Disable auto-generation: AI_AUTO_GENERATE=false

### "Quality scores low"
- Lower threshold: AI_PASS_SCORE=7.0
- Review prompts in generator.js
- Check input data quality

### "Rate limit exceeded"
```javascript
import { rateLimiter } from "./ai/config.js";
console.log(rateLimiter.getStats());
```

## Best Practices

### DO
- Test in mock mode first
- Use for monthly/weekly insights
- Cache aggressively
- Monitor costs closely
- Collect user feedback
- Start with manual generation

### DON'T
- Enable auto-generation immediately
- Generate on every page load
- Trust AI numbers over your analytics
- Skip the evaluator
- Disable fallback protection
- Ignore cost alerts

## Future Enhancements

Already architected for:
- Model swapping (OpenAI to Anthropic)
- Fine-tuning with feedback
- Industry-specific prompts
- Multi-month context
- A/B testing prompts
- Report versioning

## NPM Scripts

```bash
npm run ai:setup    # Verify AI system setup
npm run ai:test     # Test AI system (mock mode)
npm run dev         # Start server with AI routes
```

---



