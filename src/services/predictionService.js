const { supabaseAdmin } = require('../config/supabase');

/**
 * Generate price prediction based on historical data trends.
 * Uses a simple moving average + trend analysis approach.
 *
 * @param {string} commodity - Commodity name (e.g., "Wheat")
 * @param {string} market - Optional market/mandi name
 * @returns {Object} Prediction result
 */
const getPricePrediction = async (commodity, market = null) => {
    // Fetch last 30 days of price history from Supabase
    let query = supabaseAdmin
        .from('mandi_prices')
        .select('modal_price, min_price, max_price, arrival_date, market')
        .ilike('commodity', commodity)
        .order('arrival_date', { ascending: false })
        .limit(90);

    if (market) {
        query = query.ilike('market', market);
    }

    const { data: history, error } = await query;

    if (error) {
        throw new Error(`Failed to fetch price history: ${error.message}`);
    }

    if (!history || history.length === 0) {
        return {
            commodity,
            market: market || 'All Markets',
            message: 'Insufficient historical data for prediction',
            hasData: false,
        };
    }

    // Calculate current average price (last 7 entries)
    const recentPrices = history.slice(0, Math.min(7, history.length));
    const currentAvg = recentPrices.reduce((sum, r) => sum + r.modal_price, 0) / recentPrices.length;

    // Calculate older average (entries 8-30)
    const olderPrices = history.slice(7, Math.min(30, history.length));
    const olderAvg = olderPrices.length > 0
        ? olderPrices.reduce((sum, r) => sum + r.modal_price, 0) / olderPrices.length
        : currentAvg;

    // Calculate even older average (entries 31-90) for longer-term trend
    const oldestPrices = history.slice(30);
    const oldestAvg = oldestPrices.length > 0
        ? oldestPrices.reduce((sum, r) => sum + r.modal_price, 0) / oldestPrices.length
        : olderAvg;

    // Short-term trend (recent vs older)
    const shortTermTrend = ((currentAvg - olderAvg) / olderAvg) * 100;
    // Long-term trend
    const longTermTrend = ((currentAvg - oldestAvg) / oldestAvg) * 100;

    // Weighted trend: 70% short-term + 30% long-term
    const weightedTrend = (shortTermTrend * 0.7) + (longTermTrend * 0.3);

    // Predicted price: apply half the weighted trend (conservative estimate)
    const predictedPrice = Math.round(currentAvg * (1 + (weightedTrend / 200)));

    // Price range: ±8% of predicted
    const rangeMin = Math.round(predictedPrice * 0.92);
    const rangeMax = Math.round(predictedPrice * 1.08);

    // Risk level based on price volatility
    const prices = recentPrices.map((r) => r.modal_price);
    const priceStdDev = calculateStdDev(prices);
    const volatility = (priceStdDev / currentAvg) * 100;

    let risk = 'low';
    if (volatility > 15) risk = 'high';
    else if (volatility > 8) risk = 'medium';

    // Determine trend direction
    const trend = weightedTrend > 1 ? 'up' : weightedTrend < -1 ? 'down' : 'stable';

    // Generate advice
    const advice = generateAdvice(trend, risk, weightedTrend);

    // Factors
    const factors = generateFactors(trend, volatility, shortTermTrend, longTermTrend);

    return {
        commodity,
        market: market || 'All Markets',
        hasData: true,
        currentPrice: Math.round(currentAvg),
        predictedPrice,
        predictedRange: { min: rangeMin, max: rangeMax },
        trend,
        priceChange: Math.round(predictedPrice - currentAvg),
        percentageChange: parseFloat(((predictedPrice - currentAvg) / currentAvg * 100).toFixed(1)),
        risk,
        volatility: parseFloat(volatility.toFixed(1)),
        advice,
        factors,
        dataPoints: history.length,
        lastUpdated: history[0]?.arrival_date || null,
    };
};

/**
 * Calculate standard deviation
 */
function calculateStdDev(values) {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((sum, d) => sum + d, 0) / (values.length - 1));
}

/**
 * Generate trading advice based on prediction
 */
function generateAdvice(trend, risk, trendPercent) {
    if (trend === 'up' && risk === 'low') {
        return 'Hold your stock for 2-3 weeks for better returns. Market conditions are favorable.';
    }
    if (trend === 'up' && risk === 'medium') {
        return 'Prices are rising but with some volatility. Consider selling in batches to reduce risk.';
    }
    if (trend === 'up' && risk === 'high') {
        return 'Prices are rising but highly volatile. Sell a portion now and hold the rest.';
    }
    if (trend === 'down' && risk === 'low') {
        return 'Prices are declining slowly. Consider selling soon to minimize losses.';
    }
    if (trend === 'down') {
        return 'Prices are falling. Consider selling your stock soon to avoid further losses.';
    }
    return 'Prices are stable. You can hold your stock or sell at current market price.';
}

/**
 * Generate factors affecting the price
 */
function generateFactors(trend, volatility, shortTrend, longTrend) {
    const factors = [];

    if (shortTrend > 3) {
        factors.push({ type: 'positive', text: 'Strong short-term price increase observed' });
    } else if (shortTrend < -3) {
        factors.push({ type: 'negative', text: 'Short-term price decline detected' });
    } else {
        factors.push({ type: 'neutral', text: 'Short-term prices are relatively stable' });
    }

    if (longTrend > 5) {
        factors.push({ type: 'positive', text: 'Long-term upward trend supports higher prices' });
    } else if (longTrend < -5) {
        factors.push({ type: 'warning', text: 'Long-term downward trend may continue' });
    }

    if (volatility > 15) {
        factors.push({ type: 'warning', text: 'High price volatility — market is unpredictable' });
    } else if (volatility < 5) {
        factors.push({ type: 'positive', text: 'Low volatility indicates a stable market' });
    }

    // Seasonal factor (rough Indian agricultural calendar)
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) {
        factors.push({ type: 'neutral', text: 'Rabi harvest season — supply increase may moderate prices' });
    } else if (month >= 9 && month <= 11) {
        factors.push({ type: 'neutral', text: 'Kharif harvest season — watch for supply-driven changes' });
    }

    return factors;
}

module.exports = { getPricePrediction };
