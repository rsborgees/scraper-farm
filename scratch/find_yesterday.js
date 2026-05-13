const { supabase } = require('../supabaseClient');

async function findAnything() {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('*')
            .limit(100);

        if (error) throw error;
        
        console.log('Total items fetched for inspection:', data.length);
        data.forEach(item => {
            const str = JSON.stringify(item);
            if (str.includes('11/05/2026') || str.includes('2026-05-11')) {
                console.log('Found item from 11/05:', item.id, item.hora_entrada, item.sent_at);
            }
        });
        
        if (data.length > 0) {
            console.log('Sample item:', data[0]);
        }
    } catch (err) {
        console.error(err);
    }
}

findAnything();
