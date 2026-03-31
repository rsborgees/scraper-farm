const { supabase } = require('./supabaseClient');
require('dotenv').config();

async function checkDateFields() {
    console.log('🔍 Verificando campos de data nos últimos 80 itens...');
    const { data, error } = await supabase
        .from('produtos')
        .select('nome, loja, sent_at, hora_entrada, hora_envio')
        .order('sent_at', { ascending: false, nullsFirst: true }) // Procura os nulls primeiro
        .limit(80);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.table(data.map(item => ({
        ...item,
        nome: item.nome ? item.nome.substring(0, 30) : 'null'
    })));
}

checkDateFields();
