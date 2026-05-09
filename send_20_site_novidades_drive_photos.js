const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId, markAsSent } = require('./historyManager');
const { supabase } = require('./supabaseClient');
require('dotenv').config();

const WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";

async function run(limit = 20) {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: 20 NOVIDADES DO SITE COM FOTOS DO DRIVE (FORA DO SUPABASE)`);
    console.log('='.repeat(60) + '\n');

    try {
        // 1. IDs do Supabase
        const { data: supabaseData } = await supabase.from('produtos').select('id');
        const supabaseIds = new Set(supabaseData.map(p => normalizeId(p.id)));
        console.log(`✅ Supabase: ${supabaseIds.size} IDs.`);

        // 2. Itens do Drive (para pegar as fotos)
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const driveItems = await getExistingIdsFromDrive(folderId);
        const driveMap = new Map();
        driveItems.forEach(item => {
            driveMap.set(normalizeId(item.id), item);
        });
        console.log(`✅ Drive: ${driveMap.size} itens mapeados.`);

        // 3. Novidades do Site (VTEX API) - Estas são garantidas de estarem online
        console.log('🌐 Buscando novidades no site (VTEX API)...');
        const url = 'https://www.farmrio.com.br/api/catalog_system/pub/products/search?O=OrderByReleaseDateDESC&_from=0&_to=49';
        const response = await axios.get(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        const siteItems = response.data;
        console.log(`✅ Site: ${siteItems.length} novidades encontradas.`);

        const results = [];
        const { checkFarmTimer } = require('./scrapers/farm/timer_check');
        const timerData = await checkFarmTimer();

        for (const p of siteItems) {
            if (results.length >= limit) break;

            const fullId = p.productReference || '';
            const baseId = normalizeId(fullId.split('_')[0]);
            console.log(`🔍 Verificando Site ID: ${baseId} (Original: ${fullId})`);
            
            // Filtro 1: Não estar no Supabase
            if (supabaseIds.has(baseId)) {
                console.log(`   ⏭️ Já está no Supabase.`);
                continue;
            }

            // Filtro 2: Estar no Drive (para ter a foto do drive)
            const driveItem = driveMap.get(baseId);
            if (!driveItem) {
                console.log(`   ⏭️ Não encontrado no Drive.`);
                continue;
            }

            console.log(`   ✅ Encontrado no Drive!`);

            const item = p.items[0];
            const stock = item.sellers[0].commertialOffer.AvailableQuantity;
            if (stock === 0) continue;

            // Coletar tamanhos
            const availableSizes = new Set();
            p.items.forEach(itm => {
                const itmStock = itm.sellers?.[0]?.commertialOffer?.AvailableQuantity || 0;
                if (itmStock > 0) {
                    const sValues = itm['Tamanho'] || [];
                    sValues.forEach(sv => availableSizes.add(sv.toUpperCase().trim()));
                }
            });
            const uniqueSizes = Array.from(availableSizes);
            if (uniqueSizes.length === 0) continue;

            // Formatar
            const product = {
                nome: p.productName,
                id: baseId,
                precoAtual: item.sellers[0].commertialOffer.Price,
                precoOriginal: item.sellers[0].commertialOffer.ListPrice,
                imageUrl: driveItem.driveUrl, // OBRIGATÓRIO: Foto do Drive
                imagePath: driveItem.driveUrl,
                url: p.link,
                loja: 'farm',
                novidade: true,
                isNovidade: true,
                tamanhos: uniqueSizes,
                timerData: timerData
            };

            product.message = buildMessageForProduct(product);
            results.push(product);
            console.log(`   ✅ [Match] ${product.nome} (${baseId}) -> Foto Drive OK`);
        }

        console.log(`\n📦 Total coletado: ${results.length} produtos.`);

        if (results.length > 0) {
            const payload = {
                timestamp: new Date().toISOString(),
                totalProducts: results.length,
                products: results,
                type: 'manual_site_novidades_drive_photos'
            };

            console.log('📤 Enviando para Webhook:', WEBHOOK_URL);
            const res = await axios.post(WEBHOOK_URL, payload);
            console.log(`✅ Webhook enviado com sucesso! Status: ${res.status}`);
            markAsSent(results.map(p => p.id));
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    }
}

run(20);
