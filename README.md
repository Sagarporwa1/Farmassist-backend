# Kisan App Backend

This is the Node.js + Express backend service for the Kisan App, providing real-time crop pricing, inventory tracking, predictive market analysis, and residue pickup management.

## 🛠 Features & What Has Been Built

### 1. Database & Schema Architecture (`/supabase/schema.sql`)
The backend is seamlessly connected to a powerful Postgres architecture deployed on Supabase, featuring 3 primary tables:
- **`mandi_prices`**: Fully indexed table that functions as a cache for Data.gov.in daily market rates.
- **`user_stocks`**: Inventory management allowing users to track the purchase dates, prices, and volumes of their crops. 
- **`residue_pickups`**: Waste management system enabling eco-friendly crop stubble pickup requests.
*Row Level Security (RLS) has been configured to securely allow the frontend to access these tables from the `anon` key without relying on strict Service roles.*

### 2. Live Market APIs & Cron Syncing
- Connected a robust integration with the **Data.gov.in API** (`DATA_GOV_API_KEY`).
- Scripted an automated background worker (`node-cron`) to periodically scrape, analyze, and sink over 1500+ daily Mandi price records directly into Supabase (`GET /api/mandi-prices`).
- Added a fast manual-trigger endpoint to initiate instant data-scraping batches (`POST /api/cron/fetch-prices`).

### 3. Price Prediction Engine (`/src/services/predictionService.js`)
- Built a mathematical analysis algorithm using **Simple Moving Averages & Standard Deviation** to analyze 30 to 90-day historic Supabase price data.
- The `/api/predictions/:commodity` endpoint dynamically predicts price trajectories, calculates market volatility, and automatically generates textual advice (e.g., *"Hold your stock for 2-3 weeks"*). 
*(Note: Pluggable design ensures this can easily be replaced with a Python/ML model via OpenAI or Gemini in the future).*

### 4. Application REST Routes (`/src/routes/`)
- Mapped Express routers for comprehensive CRUD support across all app features:
  - `/api/stocks`: Adds, lists, deletes, and updates Farmer Inventories. Utilizes a temporary `mockAuth` identity router to bypass JWTs until the Mobile app writes an authentication flow.
  - `/api/residue`: Allows logging crop stubble and tracking pickup status from the field (`/pickup` & `/requests`).

## 🚀 How to Run Locally

### 1. Prerequisites 
Ensure your `.env` is fully populated:
```env
PORT=5000
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
DATA_GOV_API_KEY=YOUR_DATAGOVIN_KEY
DATA_GOV_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
```

### 2. Start the Server
```bash
npm install
npm run dev
```

### 3. Fetching Initial Market Data
To seed your Supabase database with the market data right now, send a cURL or POST request inside Windows PowerShell to:
```bash
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/cron/fetch-prices
```
