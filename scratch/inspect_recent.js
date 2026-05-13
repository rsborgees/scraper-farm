const { supabase } = require('../supabaseClient');

async function inspect() {
    try {
        const { data, error } = await supabase
            .from('produtos')
            .select('nome, loja, hora_entrada, favorito, novidade, bazar')
            .order('id', { ascending: false })
            .limit(20);

        if (error) throw error;
        console.table(data);
    } catch (err) {
        console.error(err);
    }
}

inspect();
