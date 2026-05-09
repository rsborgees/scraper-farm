const axios = require('axios');
const { normalizeId } = require('../historyManager');
const { supabase } = require('../supabaseClient');

async function checkSite() {
    const url = 'https://www.farmrio.com.br/api/catalog_system/pub/products/search?O=OrderByReleaseDateDESC&_from=0&_to=49';
    const response = await axios.get(url);
    console.log(`✅ Site retornou ${response.data.length} itens.`);
    
    const { data: supabaseData } = await supabase.from('produtos').select('id');
    const supabaseIds = new Set(supabaseData.map(p => normalizeId(p.id)));
    
    const missing = response.data.filter(p => !supabaseIds.has(normalizeId(p.productReference.split('_')[0])));
    console.log(`🎯 Itens do site NÃO no Supabase: ${missing.length}`);
    missing.slice(0, 5).forEach(p => console.log(`- ${p.productName} (${p.productReference})`));
}

checkSite();
