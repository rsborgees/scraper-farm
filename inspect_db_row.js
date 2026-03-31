const { supabase } = require('./supabaseClient');

async function inspectRow() {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
            const row = data[0];
            console.log('--- Row Inspection ---');
            for (const [key, value] of Object.entries(row)) {
                console.log(`${key}: ${JSON.stringify(value)} (${typeof value})`);
            }
        } else {
            console.log('No data found.');
        }
    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

inspectRow();
