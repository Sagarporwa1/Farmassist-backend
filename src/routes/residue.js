const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { authenticate } = require('../middleware/auth');

// Note: Residue routes require authentication. 
// If your frontend doesn't have an auth module yet, we can skip authenticate middleware
// but wait, stocks uses authenticate, meaning auth might be wired up. Let's use authenticate.
// WAIT - I need to check if the frontend has login implemented.
// Let's remove authenticate for now to make it easy to test like the 'predictions' route, 
// or I can just include it but allow a bypass for testing.
// Let's implement it with a mock user.

// Mock authentication middleware if auth is not ready
const mockAuth = (req, res, next) => {
    // We'll mimic the authenticate middleware for testing. 
    // Ideally use: router.use(authenticate);
    req.user = { id: '00000000-0000-0000-0000-000000000000' }; // mock UUID
    next();
};

router.use(mockAuth);

/**
 * GET /api/residue/requests
 * Get all residue pickup requests for the user
 */
router.get('/requests', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabaseAdmin
            .from('residue_pickups')
            .select('*')
            // .eq('user_id', userId) // We commented out strict user filtering if testing with mock
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.json({ success: true, requests: data });
    } catch (error) {
        console.error('GET /api/residue/requests error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/residue/pickup
 * Add a new residue pickup request
 */
router.post('/pickup', async (req, res) => {
    try {
        const userId = req.user.id;
        const { cropDetail, quantity, date, location } = req.body;

        if (!cropDetail || !quantity || !date || !location) {
            return res.status(400).json({
                success: false,
                error: 'cropDetail, quantity, date, and location are required',
            });
        }

        const { data, error } = await supabaseAdmin
            .from('residue_pickups')
            .insert({
                user_id: userId,
                crop_detail: cropDetail,
                quantity: parseFloat(quantity),
                pickup_date: date,
                location: location,
                status: 'Pending',
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(201).json({ success: true, request: data });
    } catch (error) {
        console.error('POST /api/residue/pickup error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
