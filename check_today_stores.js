const { supabase } = require('./supabaseClient');

async function checkToday() {
    const { data, error } = await supabase
        .from('produtos')
        .select('loja, id');

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    const counts = {};
    data.forEach(p => {
        const store = (p.loja || 'desconhecida').toLowerCase();
        counts[store] = (counts[store] || 0) + 1;
    });

    console.log('📊 Contagem por loja (Supabase):');
    Object.entries(counts).forEach(([store, count]) => {
        console.log(`   🔸 ${store.padEnd(10)}: ${count}`);
    });
}

checkToday();
