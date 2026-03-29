const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Check your .env file.');
    process.exit(1);
}

// Public client (respects RLS policies)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (bypasses RLS — use only for server-side operations like cron jobs)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

module.exports = { supabase, supabaseAdmin };
