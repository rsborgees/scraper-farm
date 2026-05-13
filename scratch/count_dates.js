const { supabase } = require('../supabaseClient');

async function count() {
    try {
        const { count, error } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true })
            .ilike('hora_entrada', '%11/05/2026%');

        if (error) throw error;
        console.log('Count for 11/05/2026:', count);

        const { count: countTotal, error: errorTotal } = await supabase
            .from('produtos')
            .select('*', { count: 'exact', head: true });
        
        console.log('Total items in DB:', countTotal);
    } catch (err) {
        console.error(err);
    }
}

count();
