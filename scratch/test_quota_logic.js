const { loadQuotaTargets } = require('../utils/quotaManager');

// Mock do estado atual para testes
const mockStats = {
    stores: {
        farm: 80,    // Meta 110, falta 30
        dressto: 10,  // Meta 25, falta 15
        live: 5,     // Meta 13, falta 8
        kju: 2,      // Meta 8, falta 6
        zzmall: 1    // Meta 3, falta 2
    }
};

// Mock de metas (simulando retorno do Supabase)
const mockTargets = {
    farm: 110,
    dressto: 25,
    live: 13,
    kju: 8,
    zzmall: 3
};

/**
 * Versão simplificada da lógica para teste isolado
 */
function testCalculateQuotas(currentStats, dbTargets, currentHour) {
    const IDEAL_TARGETS = dbTargets;
    const endHour = 21;
    const hoursRemaining = Math.max(1, endHour - currentHour + 1);

    console.log(`\n--- CENÁRIO: Hora ${currentHour}h | Restam ${hoursRemaining}h ---`);
    
    const needed = {};
    let totalNeeded = 0;

    Object.keys(IDEAL_TARGETS).forEach(store => {
        const current = currentStats.stores[store] || 0;
        const target = IDEAL_TARGETS[store];
        const diff = Math.max(0, target - current);
        needed[store] = diff;
        totalNeeded += diff;
    });

    const sessionQuotas = {};
    const SESSION_CAPACITY = 12;
    let totalDistributed = 0;

    Object.keys(needed).forEach(store => {
        const gap = needed[store];
        let hourlyTarget = Math.ceil(gap / hoursRemaining);
        sessionQuotas[store] = hourlyTarget;
        totalDistributed += hourlyTarget;
    });

    if (totalDistributed > SESSION_CAPACITY) {
        console.log(`⚠️  Excedeu capacidade (${totalDistributed} > ${SESSION_CAPACITY}). Balanceando...`);
        const balancedQuotas = { farm: 0, dressto: 0, kju: 0, live: 0, zzmall: 0 };
        let distributed = 0;

        const priorityScore = (store) => {
            const current = currentStats.stores[store] || 0;
            const target = IDEAL_TARGETS[store];
            return (target - current) / target;
        };

        const sortedByPriority = Object.keys(needed).filter(s => needed[s] > 0).sort((a, b) => priorityScore(b) - priorityScore(a));

        for (const store of sortedByPriority) {
            if (distributed < SESSION_CAPACITY) {
                balancedQuotas[store]++;
                distributed++;
            }
        }

        let idx = 0;
        while (distributed < SESSION_CAPACITY) {
            const store = sortedByPriority[idx % sortedByPriority.length];
            if (balancedQuotas[store] < sessionQuotas[store] && balancedQuotas[store] < needed[store]) {
                balancedQuotas[store]++;
                distributed++;
            } else if (distributed >= totalDistributed) {
                break;
            }
            idx++;
            if (idx > 100) break;
        }
        Object.assign(sessionQuotas, balancedQuotas);
    }

    console.log('🎯 Quotas Resultantes:', sessionQuotas);
    return sessionQuotas;
}

// Teste 1: Início do dia (7h)
testCalculateQuotas(mockStats, mockTargets, 7);

// Teste 2: Meio do dia (14h)
testCalculateQuotas(mockStats, mockTargets, 14);

// Teste 3: Quase fim do dia (20h)
testCalculateQuotas(mockStats, mockTargets, 20);

// Teste 4: Última hora (21h)
testCalculateQuotas(mockStats, mockTargets, 21);

// Teste 5: Meta quase batida
const metaQuaseBatida = {
    stores: { farm: 105, dressto: 24, live: 12, kju: 7, zzmall: 2 }
};
testCalculateQuotas(metaQuaseBatida, mockTargets, 10);
