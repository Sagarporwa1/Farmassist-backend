const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { fetchMandiPrices } = require('../services/dataGovService');

/**
 * GET /api/mandi-prices
 * Get mandi prices — first tries Supabase (cached), falls back to live data.gov.in API
 *
 * Query params:
 *   - commodity: Filter by crop name (e.g., "Wheat")
 *   - state: Filter by state (e.g., "Delhi")
 *   - district: Filter by district
 *   - market: Filter by mandi name
 *   - search: General search across commodity and market
 *   - limit: Number of records (default 50)
 *   - offset: Pagination offset (default 0)
 *   - source: "live" to force fetch from data.gov.in (default "db")
 */
router.get('/', async (req, res) => {
    try {
        const {
            commodity,
            state,
            district,
            market,
            search,
            limit = 50,
            offset = 0,
            source = 'db',
        } = req.query;

        // If source=live, fetch directly from data.gov.in
        if (source === 'live') {
            const result = await fetchMandiPrices({
                commodity,
                state,
                district,
                market,
                limit: parseInt(limit),
                offset: parseInt(offset),
            });
            return res.json({ success: true, source: 'data.gov.in', ...result });
        }

        // Default: fetch from Supabase
        let query = supabaseAdmin
            .from('mandi_prices')
            .select('*', { count: 'exact' })
            .order('arrival_date', { ascending: false })
            .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

        if (commodity) query = query.ilike('commodity', `%${commodity}%`);
        if (state) query = query.ilike('state', `%${state}%`);
        if (district) query = query.ilike('district', `%${district}%`);
        if (market) query = query.ilike('market', `%${market}%`);

        // General search: match against commodity OR market name
        if (search) {
            query = query.or(`commodity.ilike.%${search}%,market.ilike.%${search}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Supabase query error:', error.message);
            return res.status(500).json({ success: false, error: error.message });
        }

        // Mark best price per commodity (lowest modal_price per commodity in results)
        const bestPrices = {};
        data.forEach((item) => {
            if (!bestPrices[item.commodity] || item.modal_price < bestPrices[item.commodity]) {
                bestPrices[item.commodity] = item.modal_price;
            }
        });

        const records = data.map((item) => ({
            ...item,
            isBestPrice: item.modal_price === bestPrices[item.commodity],
        }));

        res.json({
            success: true,
            source: 'supabase',
            records,
            total: count,
            count: records.length,
        });
    } catch (error) {
        console.error('GET /api/mandi-prices error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/mandi-prices/commodities
 * Get list of unique commodities available in the database
 */
router.get('/commodities', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('mandi_prices')
            .select('commodity')
            .order('commodity');

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Get unique values
        const commodities = [...new Set(data.map((r) => r.commodity))].sort();

        res.json({ success: true, commodities });
    } catch (error) {
        console.error('GET /commodities error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/mandi-prices/:commodity
 * Get prices for a specific commodity across all markets
 */
router.get('/:commodity', async (req, res) => {
    try {
        const { commodity } = req.params;
        const { state, limit = 50 } = req.query;

        let query = supabaseAdmin
            .from('mandi_prices')
            .select('*')
            .ilike('commodity', commodity)
            .order('arrival_date', { ascending: false })
            .limit(parseInt(limit));

        if (state) query = query.ilike('state', `%${state}%`);

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Find best price
        const bestPrice = data.reduce((min, item) =>
            item.modal_price < min ? item.modal_price : min, Infinity);

        const records = data.map((item) => ({
            ...item,
            isBestPrice: item.modal_price === bestPrice,
        }));

        res.json({ success: true, commodity, records, count: records.length });
    } catch (error) {
        console.error(`GET /api/mandi-prices/${req.params.commodity} error:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
