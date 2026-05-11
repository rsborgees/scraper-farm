const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId, markAsSent } = require('./historyManager');
const { supabase } = require('./supabaseClient');
require('dotenv').config();

const WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";

async function sendNovidadesExtra(limit = 10) {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: ENVIANDO ${limit} NORMAIS DO DRIVE (FORA DO SUPABASE) - ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        
        // 1. Buscar IDs do Supabase
        console.log('🔍 Coletando IDs do Supabase...');
        const { data: supabaseData, error: supabaseError } = await supabase.from('produtos').select('id');
        if (supabaseError) throw supabaseError;
        const supabaseIds = new Set(supabaseData.map(p => normalizeId(p.id)));
        console.log(`✅ ${supabaseIds.size} IDs encontrados no Supabase.`);

        // 2. Buscar itens do Drive
        console.log('📂 Coletando itens do Google Drive...');
        const allDriveItems = await getExistingIdsFromDrive(folderId);
        const history = loadHistory();

        // 3. Filtrar Normais que NÃO estão no Supabase e NÃO foram enviadas no bloco anterior
        // Usamos o history para saber o que acabamos de tentar enviar (há poucos minutos)
        let candidates = allDriveItems.filter(item => {
            const normId = normalizeId(item.id);
            const isNormal = !item.bazar && item.store === 'farm';
            const notInSupabase = !supabaseIds.has(normId);
            
            // Filtro de histórico: se foi tentado nos últimos 30 minutos, pule
            const historyEntry = history[normId];
            const notRecentlySent = !historyEntry || (Date.now() - historyEntry.timestamp > 30 * 60 * 1000);
            
            return isNormal && notInSupabase && notRecentlySent;
        });

        console.log(`✅ Encontrados ${candidates.length} candidatos (Normais Farm Drive fora do Supabase).`);

        if (candidates.length === 0) {
            console.log('ℹ️ Nenhum item normal extra encontrado no Drive que não esteja no Supabase.');
            return;
        }

        // 4. Ordenação (Mais recentes primeiro)
        candidates.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));

        // 5. Inicializar navegador
        const { browser, context } = await initBrowser();
        const results = [];

        try {
            const stores = [...new Set(candidates.map(item => item.store))];
            console.log(`🔍 Processando candidatos por loja: ${stores.join(', ')}...`);

            for (const store of stores) {
                if (results.length >= limit) break;

                const storeItems = candidates.filter(item => item.store === store);
                console.log(`\n🔍 Processando ${storeItems.length} itens da ${store.toUpperCase()}...`);

                let scraped;
                if (store === 'farm') {
                    scraped = await scrapeSpecificIds(context, storeItems, limit - results.length, { maxAgeHours: 0 });
                } else {
                    const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
                    scraped = await scrapeSpecificIdsGeneric(context, storeItems, store, limit - results.length, { maxAgeHours: 0 });
                }

                if (scraped.products && scraped.products.length > 0) {
                    scraped.products.forEach(p => {
                        if (results.length >= limit) return;
                        
                        // Forçar uso da imagem do Drive se disponível no candidato original
                        const original = storeItems.find(c => normalizeId(c.id) === normalizeId(p.id));
                        if (original && original.driveUrl) {
                            p.imageUrl = original.driveUrl;
                            p.imagePath = original.driveUrl;
                        }

                        if (!p.message) p.message = buildMessageForProduct(p);
                        p.novidade = true;
                        p.isNovidade = true;
                        results.push(p);
                    });
                }
            }

            console.log(`\n📦 Total coletado para envio: ${results.length} produtos.`);

            if (results.length > 0) {
                const payload = {
                    timestamp: new Date().toISOString(),
                    totalProducts: results.length,
                    products: results,
                    type: 'manual_drive_novidades_extra'
                };

                console.log('📤 Enviando para Webhook:', WEBHOOK_URL);
                const response = await axios.post(WEBHOOK_URL, payload);
                console.log(`✅ Webhook enviado com sucesso! Status: ${response.status}`);

                // 7. Atualizar Histórico
                const sentIds = results.map(p => p.id);
                markAsSent(sentIds);
                console.log(`✅ ${sentIds.length} itens marcados no histórico.`);
            } else {
                console.log('⚠️ Nenhum item foi capturado com sucesso (provavelmente não encontrados no site).');
            }

        } finally {
            await browser.close();
        }

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

sendNovidadesExtra(20);
