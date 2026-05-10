const { supabase } = require('../supabaseClient');
const { loadQuotaTargets } = require('../utils/quotaManager');

function getTodayBRTString() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const [{ value: day }, , { value: month }, , { value: year }] = formatter.formatToParts(now);
    return `${day}/${month}/${year}`;
}

async function getSupabaseStats() {
    try {
        const today = getTodayBRTString();
        console.log(`🔍 [Stats] Buscando produtos enviados em: ${today}`);

        const { data, error } = await supabase
            .from('produtos')
            .select('loja, bazar, favorito, novidade, hora_entrada')
            .like('hora_entrada', `${today}%`);

        if (error) throw error;

        const stats = {
            total: data.length,
            stores: { 
                farm: 0, 
                farm_bazar: 0, 
                farm_novidade: 0,
                dressto: 0, 
                live: 0, 
                kju: 0, 
                zzmall: 0 
            },
            bazar: 0
        };

        data.forEach(item => {
            const store = (item.loja || '').toLowerCase();
            const storeKey = (store === 'dress' || store === 'dressto') ? 'dressto' : store;
            
            if (storeKey === 'farm') {
                stats.stores.farm++;
                if (item.bazar) {
                    stats.stores.farm_bazar++;
                } else if (item.favorito || item.novidade) {
                    stats.stores.farm_novidade++;
                }
            } else {
                if (stats.stores[storeKey] !== undefined) {
                    stats.stores[storeKey]++;
                }
            }

            if (item.bazar) {
                stats.bazar++;
            }
        });

        return stats;
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return null;
    }
}

async function diagnose() {
    const stats = await getSupabaseStats();
    const targets = await loadQuotaTargets();

    if (!stats || !targets) return;

    const farmTotalTarget = targets.farm || 0;
    const farmBazarTarget = targets['bazar farm'] || 0;
    const farmNovidadeTarget = targets['novidades/fav farm'] || 0;
    const farmNormalTarget = Math.max(0, farmTotalTarget - farmBazarTarget - farmNovidadeTarget);

    const IDEAL_TARGETS = {
        farm_normal: farmNormalTarget,
        farm_bazar: farmBazarTarget,
        farm_novidade: farmNovidadeTarget,
        dressto: targets.dressto || 0,
        live: targets.live || 0,
        kju: targets.kju || 0,
        zzmall: targets.zzmall || 0
    };

    console.log('\n--- DIAGNÓSTICO DE QUOTA ---');
    Object.keys(IDEAL_TARGETS).forEach(key => {
        let current = 0;
        if (key === 'farm_normal') {
            current = Math.max(0, stats.stores.farm - stats.stores.farm_bazar - stats.stores.farm_novidade);
        } else {
            current = stats.stores[key] || 0;
        }
        const target = IDEAL_TARGETS[key];
        const gap = Math.max(0, target - current);
        console.log(`${key.toUpperCase().padEnd(15)}: Atual=${current}, Meta=${target}, GAP=${gap}`);
    });

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false
    });
    const currentHour = parseInt(formatter.format(now));
    const endHour = 21;
    const hoursRemaining = Math.max(1, endHour - currentHour + 1);

    console.log(`\nHora atual (BRT): ${currentHour}h`);
    console.log(`Horas restantes (até 21h inclusivo): ${hoursRemaining}`);
}

diagnose();
