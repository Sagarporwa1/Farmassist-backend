const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
// const { authenticate } = require('../middleware/auth');

// Temporarily using mock auth since frontend doesn't supply a real JWT yet.
const mockAuth = (req, res, next) => {
    req.user = { id: '00000000-0000-0000-0000-000000000000' };
    next();
};

// All stock routes require authentication
router.use(mockAuth);

/**
 * GET /api/stocks
 * Get all stocks for the authenticated user
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabaseAdmin
            .from('user_stocks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        // Calculate total inventory value
        const totalValue = data.reduce((sum, stock) => sum + (stock.quantity * stock.purchase_price), 0);

        res.json({
            success: true,
            stocks: data,
            summary: {
                totalItems: data.length,
                totalValue,
            },
        });
    } catch (error) {
        console.error('GET /api/stocks error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/stocks
 * Add a new stock for the authenticated user
 *
 * Body: { crop_name, quantity, unit, purchase_price }
 */
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { crop_name, quantity, unit = 'quintal', purchase_price } = req.body;

        // Validation
        if (!crop_name || !quantity || !purchase_price) {
            return res.status(400).json({
                success: false,
                error: 'crop_name, quantity, and purchase_price are required',
            });
        }

        if (quantity <= 0 || purchase_price <= 0) {
            return res.status(400).json({
                success: false,
                error: 'quantity and purchase_price must be positive numbers',
            });
        }

        const { data, error } = await supabaseAdmin
            .from('user_stocks')
            .insert({
                user_id: userId,
                crop_name,
                quantity: parseFloat(quantity),
                unit,
                purchase_price: parseFloat(purchase_price),
                purchase_date: new Date().toISOString().split('T')[0],
            })
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        res.status(201).json({ success: true, stock: data });
    } catch (error) {
        console.error('POST /api/stocks error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/stocks/:id
 * Update a stock entry
 *
 * Body: { crop_name?, quantity?, unit?, purchase_price? }
 */
router.put('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const updates = {};

        // Only include fields that were provided
        if (req.body.crop_name) updates.crop_name = req.body.crop_name;
        if (req.body.quantity) updates.quantity = parseFloat(req.body.quantity);
        if (req.body.unit) updates.unit = req.body.unit;
        if (req.body.purchase_price) updates.purchase_price = parseFloat(req.body.purchase_price);

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No fields to update',
            });
        }

        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('user_stocks')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)  // Ensure user owns this stock
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        if (!data) {
            return res.status(404).json({ success: false, error: 'Stock not found' });
        }

        res.json({ success: true, stock: data });
    } catch (error) {
        console.error('PUT /api/stocks error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/stocks/:id
 * Delete a stock entry
 */
router.delete('/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const { data, error } = await supabaseAdmin
            .from('user_stocks')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)  // Ensure user owns this stock
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, error: error.message });
        }

        if (!data) {
            return res.status(404).json({ success: false, error: 'Stock not found' });
        }

        res.json({ success: true, message: 'Stock deleted successfully' });
    } catch (error) {
        console.error('DELETE /api/stocks error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
