const express = require('express');
const router = express.Router();
const { getPricePrediction } = require('../services/predictionService');

/**
 * GET /api/predictions/:commodity
 * Get price prediction for a specific commodity
 *
 * Query params:
 *   - market: Optional market/mandi name for market-specific prediction
 */
router.get('/:commodity', async (req, res) => {
    try {
        const { commodity } = req.params;
        const { market } = req.query;

        const prediction = await getPricePrediction(commodity, market);

        res.json({ success: true, prediction });
    } catch (error) {
        console.error(`GET /api/predictions/${req.params.commodity} error:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
