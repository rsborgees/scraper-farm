const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId, markAsSent } = require('./historyManager');
require('dotenv').config();

const DRIVE_SYNC_WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";
const TOTAL_LIMIT = 40;

async function sendNormalItems() {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: ENVIANDO ${TOTAL_LIMIT} ITENS NORMAIS (TODAS AS LOJAS) - ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');

        // 1. Buscar todos os itens do Drive e Histórico
        console.log('📂 Coletando itens do Google Drive e Histórico...');
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        const history = loadHistory();

        // 2. Filtrar apenas itens NORMAIS (exclui favoritos, novidades e bazar)
        let candidates = allDriveItems.filter(item =>
            !item.isFavorito &&
            !item.favorito &&
            !item.novidade &&
            !item.isNovidade &&
            !item.bazar
        );

        console.log(`✅ Encontrados ${candidates.length} candidatos normais no Drive (todas as lojas).`);

        // Log por loja
        const byStore = candidates.reduce((acc, item) => {
            const s = item.store || 'unknown';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});
        console.log('📊 Distribuição por loja:', byStore);

        if (candidates.length === 0) {
            console.log('ℹ️ Nenhum item normal encontrado para enviar.');
            return;
        }

        // 3. Ordenar para rotação (inéditos primeiro, depois os mais antigos)
        candidates.forEach(item => {
            const normId = normalizeId(item.driveId || item.id);
            const historyEntry = history[normId];
            item._lastSent = historyEntry ? historyEntry.timestamp : 0;
        });

        candidates.sort((a, b) => a._lastSent - b._lastSent);

        // 4. Pegar pool maior para garantir 40 sucessos após scraping
        // Pegamos 60 candidatos (mais antigos/inéditos) para ter margem
        const targetItems = candidates.slice(0, 60);
        console.log(`🎯 Selecionados ${targetItems.length} candidatos (top inéditos/mais antigos) para tentar chegar em ${TOTAL_LIMIT} sucessos.`);

        // 5. Inicializar navegador
        const { browser, context } = await initBrowser();
        const results = [];

        try {
            // Agrupar por loja
            const stores = [...new Set(targetItems.map(item => item.store).filter(Boolean))];
            console.log(`\n🏪 Lojas identificadas: ${stores.join(', ')}`);

            for (const store of stores) {
                const storeItems = targetItems.filter(item => item.store === store);
                console.log(`\n🔍 Processando ${storeItems.length} itens da ${store.toUpperCase()}...`);

                let scraped;
                try {
                    if (store === 'farm') {
                        scraped = await scrapeSpecificIds(context, storeItems, storeItems.length, { maxAgeHours: 0 });
                    } else {
                        scraped = await scrapeSpecificIdsGeneric(context, storeItems, store, storeItems.length, { maxAgeHours: 0 });
                    }
                } catch (storeErr) {
                    console.error(`❌ Erro ao processar ${store.toUpperCase()}:`, storeErr.message);
                    continue;
                }

                const products = scraped.products || [];
                console.log(`   ✅ ${store.toUpperCase()}: ${products.length} itens coletados.`);

                products.forEach(p => {
                    if (!p.message) {
                        p.message = buildMessageForProduct(p);
                    }
                    results.push(p);
                });
            }

            console.log(`\n📦 Total coletado para envio: ${results.length} produtos.`);

            if (results.length > 0) {
                // Slice para exatamente TOTAL_LIMIT se tiver mais
                const finalResults = results.slice(0, TOTAL_LIMIT);

                // Resumo por loja
                const storesSummary = finalResults.reduce((acc, p) => {
                    const s = (p.loja || p.brand || p.store || 'unknown').toLowerCase();
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                }, {});

                console.log(`\n📊 Distribuição final (${finalResults.length} itens):`, storesSummary);

                // 6. Enviar para Webhook
                const payload = {
                    timestamp: new Date().toISOString(),
                    totalProducts: finalResults.length,
                    products: finalResults,
                    summary: {
                        sent: finalResults.length,
                        totalCandidates: candidates.length,
                        novidades: 0,
                        favoritos: 0,
                        stores: storesSummary
                    },
                    type: 'daily_drive_sync'
                };

                console.log('📤 Enviando para Webhook:', DRIVE_SYNC_WEBHOOK_URL);
                const response = await axios.post(DRIVE_SYNC_WEBHOOK_URL, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                });

                console.log(`✅ Webhook enviado com sucesso! Status: ${response.status}`);

                // Marcar como enviado para rotação na próxima execução
                const sentIds = finalResults.map(p => p.id);
                markAsSent(sentIds);
                console.log(`📝 ${sentIds.length} IDs marcados no histórico.`);
            } else {
                console.log('⚠️ Nenhum item foi coletado com sucesso após o scraping.');
            }

        } finally {
            await browser.close();
        }

    } catch (error) {
        console.error('❌ Erro no envio manual:', error.message);
        if (error.response) {
            console.error('   Response data:', error.response.data);
        }
        process.exit(1);
    }
}

sendNormalItems();
