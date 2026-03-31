const { supabase } = require('./supabaseClient');
require('dotenv').config();

async function inspectLastItems() {
    console.log('🔍 Inspecionando os últimos 100 itens no Supabase...');
    
    const { data, error } = await supabase
        .from('produtos')
        .select('loja, sent_at, nome')
        .order('sent_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log(`📊 Total recuperado: ${data.length}`);
    data.forEach((item, i) => {
        if (i < 10 || i > 90) {
            console.log(`   [${i}] ${item.sent_at} | ${item.loja} | ${item.nome}`);
        } else if (i === 10) {
            console.log('   ...');
        }
    });

    const today = new Date().toISOString().split('T')[0];
    const todayItems = data.filter(item => item.sent_at && item.sent_at.startsWith(today));
    console.log(`\n📅 Filtro por data "${today}": ${todayItems.length} itens encontrados.`);
}

inspectLastItems();
