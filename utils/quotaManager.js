const { supabase } = require('../supabaseClient');

/**
 * Carrega as metas diárias da tabela 'quota_farm' no Supabase.
 * Transforma o array de retorno em um objeto: { farm: 110, dressto: 25, ... }
 */
async function loadQuotaTargets() {
    try {
        console.log('🔄 [QuotaManager] Carregando metas do Supabase (tabela quota_farm)...');
        
        const { data, error } = await supabase
            .from('quota_farm')
            .select('loja, meta_diaria');

        if (error) throw error;

        if (!data || data.length === 0) {
            console.warn('⚠️ [QuotaManager] Nenhum dado encontrado na tabela quota_farm. Usando fallbacks.');
            return null;
        }

        const targets = {};
        data.forEach(row => {
            targets[row.loja.toLowerCase().trim()] = row.meta_diaria;
        });

        console.log('✅ [QuotaManager] Metas carregadas:', targets);
        return targets;
    } catch (error) {
        console.error('❌ [QuotaManager] Erro ao carregar metas:', error.message);
        return null;
    }
}

module.exports = { loadQuotaTargets };
