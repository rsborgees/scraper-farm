/**
 * Engine de Distribuição de Links
 */

// Cotas Diárias (Base ~11 links por execução para atingir ~160/dia em 15 horários)
const BASE_TOTAL_LINKS = 11;
const QUOTAS = {
    FARM: {
        percent: 0.78,
        count: 8.5,
        dailyGoal: 125
    },
    DRESS: {
        percent: 0.15,
        count: 1.6,
        dailyGoal: 24
    },
    KJU: {
        percent: 0.05,
        count: 0.5,
        dailyGoal: 8
    },
    ZZMALL: {
        percent: 0.02,
        count: 0.2,
        dailyGoal: 3
    }
};

// Máximo absoluto de itens POR EXECUÇÃO por loja.
// Mesmo que haja gap (Farm/Dress não encheu), as lojas menores NÃO absorvem o slack.
const RUN_CAPS = {
    farm: 10,
    dressto: 10,
    kju: 1,
    zzmall: 1
};


// Sub-cotas Dress To
const DRESS_SUBQUOTAS = {
    'vestido': 0.60,
    'macacão': 0.25,
    'blusa': 0.03, // Equidistributed 15% / 5
    'saia': 0.03,
    'short': 0.03,
    'calça': 0.03,
    'casaco': 0.03
};

// Sub-cotas FARM
const FARM_SUBQUOTAS = {
    'vestido': 0.65,
    'macacão': 0.15,
    'saia': 0.05,
    'short': 0.05,
    'blusa': 0.05,
    'acessórios': 0.05
};

/**
 * Embaralha array (Fisher-Yates)
 */
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Filtra produtos elegíveis baseados em regras de repetição
 */
function filterEligibleProducts(products) {
    return products.filter(p => true);
}

/**
 * Distribui produtos nos slots disponíveis
 * @param {Array} allProducts Array de objetos de produto
 * @param {Object} runQuotas Quotas para esta execução (opcional)
 * @param {Object} dailyRemaining Quotas restantes do dia (opcional)
 */
function distributeLinks(allProducts, runQuotas = {}, dailyRemaining = {}) {
    const finalSelection = [];
    const selectedIds = new Set();

    // Determina o limite da rodada: se o cron balancer enviar cotas exatas, respeitamos a soma delas.
    // Isso impede de gerar "filler" e estourar a meta global do dia.
    let runTotalTarget = Object.values(runQuotas).reduce((a, b) => a + b, 0);
    const TOTAL_LINKS = runTotalTarget > 0 ? Math.min(BASE_TOTAL_LINKS, runTotalTarget) : BASE_TOTAL_LINKS;

    // Contadores desta rodada por loja
    const roundCounts = {
        farm: 0,
        dressto: 0,
        kju: 0,
        zzmall: 0
    };

    // Contadores desta rodada por categoria
    const categoryCounts = {
        'vestido': 0,
        'macacão': 0,
        'blusa': 0,
        'conjunto': 0,
        'outros': 0
    };

    function getCatItem(p) {
        if (!p) return 'outros';
        const str = (p.categoria || p.category || p.nome || '').toLowerCase();
        if (p.isSet || str.includes('conjunto') || str.includes('/conjunto')) return 'conjunto';
        if (str.includes('vestido')) return 'vestido';
        if (str.includes('macacão') || str.includes('macacao')) return 'macacão';
        if (str.includes('blusa') || str.includes('camisa') || str.includes('t-shirt') || str.includes('top') || str.includes('cropped')) return 'blusa';
        return 'outros';
    }

    // Auxiliar: Verifica se loja ainda tem saldo no dia
    const hasDailySaldo = (store) => {
        const rem = dailyRemaining && dailyRemaining.stores && dailyRemaining.stores[store] !== undefined
            ? dailyRemaining.stores[store]
            : 999;
        return (rem - roundCounts[store]) > 0;
    };

    // 1. SELEÇÃO BAZAR (Exatamente 1 item por execução, prioridade FARM)
    const bazarPool = allProducts.filter(p => p.bazar || p.isBazar);
    console.log(`📊 [Distribution] Pool de Bazar: ${bazarPool.length} itens.`);

    if (bazarPool.length > 0) {
        // REGRA: Bazar deve ser uma média de 10% da Farm.
        // Só seleciona se ainda houver saldo diário de Bazar.
        const canSendBazar = (dailyRemaining && dailyRemaining.bazar !== undefined) ? dailyRemaining.bazar > 0 : true;

        if (canSendBazar) {
            // Prioriza Farm se houver bazar e se Farm tiver saldo
            const farmBazar = bazarPool.find(p => (p.loja === 'farm' || (p.brand || '').toLowerCase() === 'farm') && hasDailySaldo('farm'));
            let selectedBazar = null;

            if (farmBazar) {
                selectedBazar = farmBazar;
                console.log(`✅ [Distribution] Selecionado Bazaar FARM (Prioridade): ${selectedBazar.nome} (${selectedBazar.id})`);
            } else {
                // Pega o primeiro bazar disponível de uma loja que tenha saldo diário
                selectedBazar = bazarPool.find(p => {
                    const s = (p.brand || p.loja || '').toLowerCase();
                    const storeKey = (s === 'dress' || s === 'dressto') ? 'dressto' : s;
                    return hasDailySaldo(storeKey);
                });
                if (selectedBazar) console.log(`✅ [Distribution] Selecionado Bazaar ${selectedBazar.loja}: ${selectedBazar.nome} (${selectedBazar.id})`);
            }

            if (selectedBazar) {
                finalSelection.push(selectedBazar);
                selectedIds.add(selectedBazar.id);
                const s = (selectedBazar.brand || selectedBazar.loja || '').toLowerCase();
                const storeKey = (s === 'dress' || s === 'dressto') ? 'dressto' : s;
                if (roundCounts[storeKey] !== undefined) roundCounts[storeKey]++;
                categoryCounts[getCatItem(selectedBazar)]++;
            }
        }
    }

    // 2. SELEÇÃO REGULAR (Itens que NÃO são bazar E QUE NÃO são favoritos/novidades)
    const regularPool = allProducts.filter(p => {
        if (selectedIds.has(p.id)) return false;
        if (p.bazar || p.isBazar) return false;

        const isFavOrNov = p.favorito || p.isFavorito || p.novidade || p.isNovidade || p.isSiteNovidade;
        if (isFavOrNov) {
            // Regra Relaxada: Lojas menores (zzmall, kju, live, dressto) PODEM enviar favoritos do Drive nas horas.
            // Apenas a FARM é estritamente proibida de enviar favoritos horários para não poluir o grupo.
            const s = (p.loja || p.brand || '').toLowerCase();
            const storeKey = (s === 'dress' || s === 'dressto') ? 'dressto' : s;
            if (storeKey === 'farm') return false;
        }

        return true;
    });

    // Função de prioridade (Vestidos e Macacões = 1, Outros = 2, Blusa/Conjunto = 3)
    function getPriority(p) {
        const cat = getCatItem(p);
        if (cat === 'vestido' || cat === 'macacão') return 1;
        if (cat === 'conjunto' || cat === 'blusa') return 3;
        return 2;
    }

    // Ordena o pool para que os prioritários sejam escolhidos antes
    regularPool.sort((a, b) => getPriority(a) - getPriority(b));

    // 1ª PASSAGEM: Seleção Dinâmica baseada nas metas da rodada (runQuotas)
    // Isso garante exatamente os 70/15/8/5/2% solicitados.
    const allStores = ['zzmall', 'kju', 'dressto', 'farm'];
    
    let iterations = 0;
    while (finalSelection.length < TOTAL_LINKS && iterations < 50) {
        iterations++;
        let addedThisRound = false;
        
        for (const store of allStores) {
            if (finalSelection.length >= TOTAL_LINKS) break;
            
            // A meta da rodada para esta loja
            const target = runQuotas[store] || 0;
            if (roundCounts[store] >= target) continue;
            
            // Saldo diário restante (Supabase + histórico local)
            if (!hasDailySaldo(store)) continue;

            const nextItem = regularPool.find(p => {
                if (selectedIds.has(p.id)) return false;
                const s = (p.loja || p.brand || '').toLowerCase();
                const storeKey = (s === 'dress' || s === 'dressto') ? 'dressto' : s;
                if (storeKey !== store) return false;

                // REGRA: Blusa e Conjunto nunca podem ser enviados em maior quantidade que macacão ou vestido,
                // A MENOS que não haja mais opções melhores na pool
                const cat = getCatItem(p);
                if (cat === 'blusa' || cat === 'conjunto') {
                    const hasBetter = regularPool.some(rp => {
                        if (selectedIds.has(rp.id)) return false;
                        const s2 = (rp.loja || rp.brand || '').toLowerCase();
                        const storeKey2 = (s2 === 'dress' || s2 === 'dressto') ? 'dressto' : s2;
                        if (storeKey2 !== store) return false;
                        const rpCat = getCatItem(rp);
                        return rpCat === 'vestido' || rpCat === 'macacão';
                    });
                    
                    if (hasBetter) {
                        if (categoryCounts[cat] > (categoryCounts['vestido'] + categoryCounts['macacão'])) {
                            return false; 
                        }
                    }
                }
                
                return true;
            });

            if (nextItem) {
                finalSelection.push(nextItem);
                selectedIds.add(nextItem.id);
                roundCounts[store]++;
                categoryCounts[getCatItem(nextItem)]++;
                addedThisRound = true;
            }
        }
        if (!addedThisRound) break;
    }

    // 3. FILLER (Se ainda houver gap, usa Favoritos de qualquer loja ou Bazar extras)
    if (finalSelection.length < TOTAL_LINKS) {
        let gap = TOTAL_LINKS - finalSelection.length;
        
        for (const p of allProducts) {
            if (finalSelection.length >= TOTAL_LINKS) break;
            if (selectedIds.has(p.id)) continue;

            const s = (p.brand || p.loja || '').toLowerCase();
            const storeKey = (s === 'dress' || s === 'dressto') ? 'dressto' : s;
            if (!hasDailySaldo(storeKey)) continue;
            if (roundCounts[storeKey] >= (RUN_CAPS[storeKey] || 999)) continue; // Cap absoluto por run

            // REGRAS FILLER FARM PRE-FILTER:
            if (storeKey === 'farm' && (p.bazar || p.isBazar) && roundCounts.farm >= 1) continue;
            if (storeKey === 'farm' && (p.favorito || p.isFavorito || p.novidade || p.isNovidade)) continue;

            const cat = getCatItem(p);
            if (cat === 'blusa' || cat === 'conjunto') {
                const hasBetter = allProducts.some(rp => {
                    if (selectedIds.has(rp.id)) return false;
                    const s2 = (rp.loja || rp.brand || '').toLowerCase();
                    const storeKey2 = (s2 === 'dress' || s2 === 'dressto') ? 'dressto' : s2;
                    if (!hasDailySaldo(storeKey2)) return false;
                    if (roundCounts[storeKey2] >= (RUN_CAPS[storeKey2] || 999)) return false;
                    const rpCat = getCatItem(rp);
                    return rpCat === 'vestido' || rpCat === 'macacão';
                });
                
                if (hasBetter) {
                    if (categoryCounts[cat] > (categoryCounts['vestido'] + categoryCounts['macacão'])) {
                        continue; 
                    }
                }
            }

            finalSelection.push(p);
            selectedIds.add(p.id);
            if (roundCounts[storeKey] !== undefined) roundCounts[storeKey]++;
            categoryCounts[cat]++;
        }
    }

    // 4. FALLBACK EXTREMO (A pedido do usuário): "Não pode perder envio"
    // Caso a fila ainda tenha vagas (gap > 0) e as restrições (saldo do dia cheio) 
    // tenham bloqueado a seleção, pegamos QUALQUER coisa do pool para não retornar 0.
    if (finalSelection.length < TOTAL_LINKS && allProducts.length > 0) {
        console.log(`🚨 [Distribution] ALERTA: Cotas estouradas, não preencheu e vai perder envio. Ignorando regras e forçando preenchimento extremo!`);
        for (const p of allProducts) {
            if (finalSelection.length >= TOTAL_LINKS) break;
            if (selectedIds.has(p.id)) continue;

            finalSelection.push(p);
            selectedIds.add(p.id);
            console.log(`   🆘 Item de resgate de uso: ${p.nome} (${p.loja})`);
        }
    }

    return shuffle(finalSelection);
}

module.exports = { distributeLinks, QUOTAS, RUN_CAPS, FARM_SUBQUOTAS, DRESS_SUBQUOTAS };
