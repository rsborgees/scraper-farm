const { supabase } = require('./supabaseClient');
require('dotenv').config();

async function checkToday() {
    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Buscando produtos de hoje (${today})...`);

    const { data, error } = await supabase
        .from('produtos')
        .select('loja, bazar, favorito, novidade, sent_at')
        .gte('sent_at', today);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log(`📊 Total de produtos hoje: ${data.length}`);
    const stats = { farm: 0, dressto: 0, live: 0, kju: 0, zzmall: 0 };
    data.forEach(item => {
        const store = (item.loja || '').toLowerCase();
        const storeKey = (store === 'dress' || store === 'dressto') ? 'dressto' : store;
        if (stats[storeKey] !== undefined) stats[storeKey]++;
    });
    console.log('📦 Por loja:', stats);
    
    // Check Bazar
    const bazar = data.filter(i => i.bazar).length;
    console.log(`🔥 Bazar: ${bazar}`);
}

checkToday();
