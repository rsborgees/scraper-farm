const { getSupabaseStats, runDailyDriveSyncJob } = require('./cronScheduler');
const { loadQuotaTargets } = require('./utils/quotaManager');

async function verify() {
    console.log('--- TESTE DE QUOTAS ---');
    const stats = { 
        total: 0, 
        stores: { farm: 0, farm_bazar: 0, farm_novidade: 0, dressto: 0, live: 0, kju: 0, zzmall: 0 }, 
        bazar: 0 
    };
    
    // Simular o que aconteceria no cronScheduler
    const dbTargets = await loadQuotaTargets();
    const TARGET_GOAL = (dbTargets && dbTargets['novidades/fav farm']) || 0;
    
    console.log(`Quota Novidades/Fav Farm detectada: ${TARGET_GOAL}`);
    
    if (TARGET_GOAL === 80) {
        console.log('✅ SUCESSO: A quota de 80 foi detectada corretamente.');
    } else {
        console.log(`❌ ERRO: Esperava 80, mas recebi ${TARGET_GOAL}`);
    }
}

verify();
