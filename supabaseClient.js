const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
    console.warn('⚠️ Supabase credentials not fully configured in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
