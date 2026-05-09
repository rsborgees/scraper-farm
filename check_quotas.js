const { supabase } = require('./supabaseClient');

async function checkQuotas() {
    const { data, error } = await supabase.from('quota_farm').select('*');
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Quotas:', JSON.stringify(data, null, 2));
}

checkQuotas();
