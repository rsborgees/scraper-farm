const { supabase } = require('../supabaseClient');

async function inspectQuotaFarm() {
    try {
        console.log('🔍 Inspecionando tabela quota_farm...');
        const { data, error } = await supabase
            .from('quota_farm')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Erro ao buscar dados:', error.message);
            console.log('Tentando buscar definição das colunas via RPC ou outro método...');
        } else if (data && data.length > 0) {
            console.log('✅ Colunas encontradas na tabela quota_farm:', Object.keys(data[0]));
            console.log('Dados da primeira linha:', data[0]);
        } else {
            console.log('ℹ️ Tabela vazia ou sem dados para inspecionar colunas via select.');
        }
    } catch (err) {
        console.error('❌ Erro fatal:', err.message);
    }
}

inspectQuotaFarm();
