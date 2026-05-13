const { supabase } = require('../supabaseClient');

async function inspect() {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('hora_entrada')
            .order('id', { ascending: false })
            .limit(1000);

        if (error) throw error;
        const dates = [...new Set(data.map(i => i.hora_entrada.split(' ')[0]))];
        console.log('Recent dates in DB:', dates);
    } catch (err) {
        console.error(err);
    }
}

inspect();
