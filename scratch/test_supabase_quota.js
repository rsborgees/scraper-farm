const { loadQuotaTargets } = require('../utils/quotaManager');

async function testSupabaseConnection() {
    console.log('🧪 Testando conexão com Supabase e tabela quota_farm...');
    const targets = await loadQuotaTargets();
    
    if (targets) {
        console.log('✅ Conexão bem sucedida! Dados recuperados:', targets);
    } else {
        console.log('⚠️  Não foi possível recuperar dados da tabela quota_farm. Verifique se ela já foi criada no Supabase.');
    }
}

testSupabaseConnection();
