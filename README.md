# Shopify Analytics SaaS

A full-stack analytics platform for Shopify merchants that provides actionable insights, root-cause analysis, and smart recommendations.

## Key Features

### Root-Cause Analysis Engine
- **Deterministic logic** that explains WHY revenue changed month-over-month
- Analyzes 6 key metrics: Revenue, Orders, AOV, Returning Customers, Conversion Rate, Shipping Time
- Plain-English explanations with impact prioritization (High/Medium/Low)
- No ML/AI - 100% transparent and explainable

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



