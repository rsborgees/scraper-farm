const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId } = require('./historyManager');
require('dotenv').config();

const DRIVE_SYNC_WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";

async function sendSpecificItems(limit = 40) {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: ENVIANDO ${limit} ITENS NORMAIS DA FARM - ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');

        // 1. Buscar itens do Drive e Histórico
        console.log('📂 Coletando itens do Google Drive e Histórico...');
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        const history = loadHistory();

        // 2. Seleção de Candidatos (Normais Farm) - EXCLUI BAZAR, FAVORITOS E NOVIDADES
        let candidates = allDriveItems.filter(item => 
            item.store === 'farm' && 
            !item.isFavorito && 
            !item.novidade && 
            !item.bazar
        );
        console.log(`✅ Encontrados ${candidates.length} candidatos (Normais Farm) no Drive.`);

        if (candidates.length === 0) {
            console.log('ℹ️ Nenhum item normal da Farm encontrado para enviar.');
            return;
        }

        // 3. Ordenação para Rotação (Inéditos primeiro, depois os mais antigos)
        candidates.forEach(item => {
            const normId = normalizeId(item.driveId || item.id);
            const historyEntry = history[normId];
            item._lastSent = historyEntry ? historyEntry.timestamp : 0;
        });

        candidates.sort((a, b) => {
            return a._lastSent - b._lastSent;
        });

        // 4. Limite solicitado (Aumentado para garantir 40 sucessos)
        const targetItems = candidates;
        console.log(`🎯 Selecionados ${targetItems.length} candidatos para tentar chegar em 40 sucessos.`);

        // 5. Inicializar navegador
        const { browser, context } = await initBrowser();
        const results = [];

        try {
            const stores = [...new Set(targetItems.map(item => item.store))];

            for (const store of stores) {
                const storeItems = targetItems.filter(item => item.store === store);
                console.log(`\n🔍 Processando ${storeItems.length} itens da ${store.toUpperCase()}...`);

                let scraped;
                if (store === 'farm') {
                    scraped = await scrapeSpecificIds(context, storeItems, 40, { maxAgeHours: 0 });
                } else {
                    scraped = await scrapeSpecificIdsGeneric(context, storeItems, store, 999, { maxAgeHours: 0 });
                }

                if (scraped.products && scraped.products.length > 0) {
                    scraped.products.forEach(p => {
                        if (!p.message) {
                            p.message = buildMessageForProduct(p);
                        }
                        results.push(p);
                    });
                }
            }

            console.log(`\n📦 Total coletado para envio: ${results.length} produtos.`);

            if (results.length > 0) {
                // Slice para exatamente 40 se tiver mais
                const finalResults = results.slice(0, 40);

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
                        stores: { 'farm': finalResults.length }
                    },
                    type: 'daily_drive_sync'
                };

                console.log('📤 Enviando para Webhook:', DRIVE_SYNC_WEBHOOK_URL);
                const response = await axios.post(DRIVE_SYNC_WEBHOOK_URL, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                });

                console.log(`✅ Webhook enviado com sucesso! Status: ${response.status}`);
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
    }
}

sendSpecificItems(40);
