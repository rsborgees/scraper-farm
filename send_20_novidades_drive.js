const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId, markAsSent } = require('./historyManager');
require('dotenv').config();

// Standard Webhook for manual drive syncs
const WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";

async function sendNovidades(limit = 20) {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: ENVIANDO ${limit} NOVIDADES DO DRIVE - ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');

        // 1. Buscar itens do Drive e Histórico
        console.log('📂 Coletando itens do Google Drive e Histórico...');
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        const history = loadHistory();

        // 2. Seleção de Candidatos (Apenas Novidades) - EXCLUI BAZAR
        let candidates = allDriveItems.filter(item => (item.novidade || item.isNovidade) && !item.bazar);
        console.log(`✅ Encontrados ${candidates.length} candidatos (Novidades) no Drive.`);

        if (candidates.length === 0) {
            console.log('ℹ️ Nenhuma novidade encontrada para enviar.');
            return;
        }

        // 3. Ordenação (Novos no drive primeiro, depois rotação por histórico)
        candidates.forEach(item => {
            const normId = normalizeId(item.driveId || item.id);
            const historyEntry = history[normId];
            item._lastSent = historyEntry ? historyEntry.timestamp : 0;
        });

        // Ordenar: 1. Nunca enviados, 2. Mais recentes no Drive (usando createdTime se disponível)
        candidates.sort((a, b) => {
            if (a._lastSent !== b._lastSent) return a._lastSent - b._lastSent;
            // Se ambos nunca foram enviados, os mais recentes no Drive vêm primeiro
            return new Date(b.createdTime) - new Date(a.createdTime);
        });

        // 4. Limite solicitado - Usar todos os candidatos para garantir que tentamos até chegar no limite
        const targetItems = candidates; 
        console.log(`🎯 Selecionados ${targetItems.length} candidatos para tentar chegar em ${limit} sucessos.`);

        // 5. Inicializar navegador
        const { browser, context } = await initBrowser();
        const results = [];

        try {
            const stores = [...new Set(targetItems.map(item => item.store))];

            for (const store of stores) {
                if (results.length >= limit) break;

                const storeItems = targetItems.filter(item => item.store === store);
                console.log(`\n🔍 Processando ${storeItems.length} itens da ${store.toUpperCase()}...`);

                let scraped;
                if (store === 'farm') {
                    scraped = await scrapeSpecificIds(context, storeItems, limit - results.length, { maxAgeHours: 0 });
                } else {
                    scraped = await scrapeSpecificIdsGeneric(context, storeItems, store, limit - results.length, { maxAgeHours: 0 });
                }

                if (scraped.products && scraped.products.length > 0) {
                    scraped.products.forEach(p => {
                        if (results.length >= limit) return;
                        
                        if (!p.message) {
                            p.message = buildMessageForProduct(p);
                        }
                        
                        // Garantir flags de novidade
                        p.novidade = true;
                        p.isNovidade = true;
                        
                        results.push(p);
                    });
                }
            }

            console.log(`\n📦 Total coletado para envio: ${results.length} produtos.`);

            if (results.length > 0) {
                const finalResults = results.slice(0, limit);

                // 6. Enviar para Webhook
                const payload = {
                    timestamp: new Date().toISOString(),
                    totalProducts: finalResults.length,
                    products: finalResults,
                    summary: {
                        sent: finalResults.length,
                        totalCandidates: candidates.length,
                        novidades: finalResults.length,
                        stores: [...new Set(finalResults.map(p => p.loja))].reduce((acc, store) => {
                            acc[store] = finalResults.filter(p => p.loja === store).length;
                            return acc;
                        }, {})
                    },
                    type: 'manual_drive_novidades'
                };

                console.log('📤 Enviando para Webhook:', WEBHOOK_URL);
                const response = await axios.post(WEBHOOK_URL, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 60000
                });

                console.log(`✅ Webhook enviado com sucesso! Status: ${response.status}`);

                // 7. Atualizar Histórico
                console.log('📝 Atualizando histórico...');
                const sentIds = finalResults.map(p => p.id || p.driveId);
                markAsSent(sentIds);
                console.log(`✅ ${sentIds.length} itens marcados como enviados.`);
            } else {
                console.log('⚠️ Nenhum item foi coletado com sucesso após o scraping.');
            }

        } finally {
            await browser.close();
        }

    } catch (error) {
        console.error('❌ Erro no envio de novidades:', error.message);
        if (error.response) {
            console.error('   Response data:', error.response.data);
        }
    }
}

sendNovidades(20);
