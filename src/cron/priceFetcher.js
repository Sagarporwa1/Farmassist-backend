const { supabaseAdmin } = require('../config/supabase');
const { fetchAllPrices } = require('../services/dataGovService');

/**
 * Fetch prices from data.gov.in and store them into Supabase.
 * Called by the daily cron job or manual trigger.
 */
const fetchAndStorePrices = async () => {
    console.log('Fetching mandi prices from data.gov.in...');

    const records = await fetchAllPrices(1500);

    if (records.length === 0) {
        console.log('No records fetched from data.gov.in');
        return { count: 0 };
    }

    console.log(`Fetched ${records.length} records. Storing in Supabase...`);

    // Prepare records for upsert
    const rows = records.map((r) => ({
        state: r.state,
        district: r.district,
        market: r.market,
        commodity: r.commodity,
        variety: r.variety,
        grade: r.grade,
        min_price: r.min_price,
        max_price: r.max_price,
        modal_price: r.modal_price,
        arrival_date: r.arrival_date,
        fetched_at: new Date().toISOString(),
    }));

    // Batch insert (Supabase has a limit of ~1000 rows per request)
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        const { data, error } = await supabaseAdmin
            .from('mandi_prices')
            .upsert(batch, {
                onConflict: 'commodity,market,arrival_date',
                ignoreDuplicates: true,
            });

        if (error) {
            console.error(`Batch insert error (offset ${i}):`, error.message);
        } else {
            insertedCount += batch.length;
        }
    }

    console.log(`Successfully stored ${insertedCount} price records.`);
    return { count: insertedCount };
};

module.exports = { fetchAndStorePrices };
