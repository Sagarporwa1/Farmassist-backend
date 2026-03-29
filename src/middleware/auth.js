const { supabase } = require('../config/supabase');

/**
 * Auth middleware — validates the Supabase JWT token from the Authorization header.
 * Attaches the authenticated user to req.user.
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Missing or invalid authorization header',
            });
        }

        const token = authHeader.split(' ')[1];

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data?.user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token',
            });
        }

        req.user = data.user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({
            success: false,
            error: 'Authentication failed',
        });
    }
};

module.exports = { authenticate };
