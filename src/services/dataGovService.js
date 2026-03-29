const axios = require('axios');

const API_BASE = 'https://api.data.gov.in/resource';
const RESOURCE_ID = process.env.DATA_GOV_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';
const API_KEY = process.env.DATA_GOV_API_KEY;

/**
 * Fetch current daily mandi prices from data.gov.in
 * @param {Object} options - Query options
 * @param {string} options.commodity - Filter by commodity name
 * @param {string} options.state - Filter by state
 * @param {string} options.district - Filter by district
 * @param {string} options.market - Filter by market/mandi name
 * @param {number} options.limit - Number of records (default 100)
 * @param {number} options.offset - Offset for pagination (default 0)
 * @returns {Object} { records: [], total: number, count: number }
 */
const fetchMandiPrices = async (options = {}) => {
    const { commodity, state, district, market, limit = 100, offset = 0 } = options;

    if (!API_KEY) {
        throw new Error('DATA_GOV_API_KEY is not set. Get your free key at https://data.gov.in');
    }

    const params = {
        'api-key': API_KEY,
        format: 'json',
        limit,
        offset,
    };

    // Apply filters
    if (commodity) params['filters[commodity]'] = commodity;
    if (state) params['filters[state]'] = state;
    if (district) params['filters[district]'] = district;
    if (market) params['filters[market]'] = market;

    try {
        const response = await axios.get(`${API_BASE}/${RESOURCE_ID}`, { params });
        const data = response.data;

        const records = (data.records || []).map((record) => ({
            state: record.state,
            district: record.district,
            market: record.market,
            commodity: record.commodity,
            variety: record.variety,
            grade: record.grade,
            min_price: parseFloat(record.min_price) || 0,
            max_price: parseFloat(record.max_price) || 0,
            modal_price: parseFloat(record.modal_price) || 0,
            arrival_date: record.arrival_date,
        }));

        return {
            records,
            total: data.total || 0,
            count: data.count || records.length,
        };
    } catch (error) {
        if (error.response) {
            console.error('data.gov.in API error:', error.response.status, error.response.data);
            throw new Error(`data.gov.in API returned ${error.response.status}`);
        }
        throw error;
    }
};

/**
 * Fetch all available prices by paginating through the API
 * Used by the cron job for full data sync
 * @param {number} maxRecords - Maximum records to fetch (default 1000)
 * @returns {Array} All fetched records
 */
const fetchAllPrices = async (maxRecords = 1000) => {
    const allRecords = [];
    let offset = 0;
    const batchSize = 100;

    while (offset < maxRecords) {
        const { records, total } = await fetchMandiPrices({ limit: batchSize, offset });
        allRecords.push(...records);

        if (records.length < batchSize || allRecords.length >= total) break;
        offset += batchSize;

        // Small delay to avoid rate-limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return allRecords;
};

module.exports = { fetchMandiPrices, fetchAllPrices };
