const { supabase } = require('./supabaseClient');
require('dotenv').config();

async function checkColumns() {
    const { data, error } = await supabase
        .from('produtos')
        .select('loja, sent_at, hora_envio, nome')
        .order('id', { ascending: false })
        .limit(20);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.table(data);
}

checkColumns();
