require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const mandiPricesRouter = require('./src/routes/mandiPrices');
const predictionsRouter = require('./src/routes/predictions');
const stocksRouter = require('./src/routes/stocks');
const residueRouter = require('./src/routes/residue');
const { fetchAndStorePrices } = require('./src/cron/priceFetcher');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/mandi-prices', mandiPricesRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/residue', residueRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual trigger to fetch prices (useful for testing)
app.post('/api/cron/fetch-prices', async (req, res) => {
    try {
        const result = await fetchAndStorePrices();
        res.json({ success: true, message: 'Prices fetched and stored', count: result.count });
    } catch (error) {
        console.error('Manual fetch error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Schedule daily price fetch at 8:00 AM IST
cron.schedule('30 2 * * *', async () => {
    // 2:30 UTC = 8:00 AM IST
    console.log('Running scheduled mandi price fetch...');
    try {
        const result = await fetchAndStorePrices();
        console.log(`Scheduled fetch complete. ${result.count} records stored.`);
    } catch (error) {
        console.error('Scheduled fetch error:', error.message);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🚀 Kisan App Backend running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});
