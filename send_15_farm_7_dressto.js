const axios = require('axios');
const { getExistingIdsFromDrive } = require('./driveManager');
const { scrapeSpecificIds } = require('./scrapers/farm/idScanner');
const { scrapeSpecificIdsGeneric } = require('./scrapers/idScanner');
const { initBrowser } = require('./browser_setup');
const { buildMessageForProduct } = require('./messageBuilder');
const { loadHistory, normalizeId, markAsSent } = require('./historyManager');
require('dotenv').config();

const WEBHOOK_URL = "https://n8n-francalheira.vlusgm.easypanel.host/webhook/fav-fran";
const FARM_TARGET = 15;
const DRESSTO_TARGET = 7;

async function run() {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 MANUAL JOB: ${FARM_TARGET} FARM + ${DRESSTO_TARGET} DRESSTO → WEBHOOK`);
    console.log(`   ${new Date().toLocaleString('pt-BR')}`);
    console.log('='.repeat(60) + '\n');

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado');

    console.log('📂 Coletando itens do Google Drive...');
    const allDriveItems = await getExistingIdsFromDrive(folderId);
    const history = loadHistory();

    // Helper: ordena por mais antigos/inéditos primeiro
    function sortByAge(items) {
        items.forEach(item => {
            const normId = normalizeId(item.driveId || item.id);
            const entry = history[normId];
            item._lastSent = entry ? entry.timestamp : 0;
        });
        return items.sort((a, b) => a._lastSent - b._lastSent);
    }

    // ─── FARM ────────────────────────────────────────────────────
    const farmCandidates = sortByAge(
        allDriveItems.filter(i =>
            i.store === 'farm' &&
            !i.isFavorito && !i.favorito &&
            !i.novidade && !i.isNovidade &&
            !i.bazar
        )
    );
    console.log(`✅ Farm: ${farmCandidates.length} candidatos normais.`);

    // ─── DRESSTO ─────────────────────────────────────────────────
    const dresstoCandidates = sortByAge(
        allDriveItems.filter(i =>
            i.store === 'dressto' &&
            !i.isFavorito && !i.favorito &&
            !i.novidade && !i.isNovidade &&
            !i.bazar
        )
    );
    console.log(`✅ Dressto: ${dresstoCandidates.length} candidatos normais.\n`);

    if (farmCandidates.length === 0 && dresstoCandidates.length === 0) {
        console.log('ℹ️ Nenhum candidato encontrado.');
        return;
    }

    const { browser, context } = await initBrowser();
    const farmResults = [];
    const dresstoResults = [];

    try {
        // ─── SCRAPE FARM ──────────────────────────────────────────
        if (farmCandidates.length > 0) {
            console.log(`\n🌾 FARM: Tentando ${farmCandidates.length} candidatos para chegar em ${FARM_TARGET}...`);
            // Passa todos os candidatos — o idScanner para quando atinge a quota
            const scraped = await scrapeSpecificIds(context, farmCandidates, FARM_TARGET, { maxAgeHours: 0 });
            const products = scraped.products || [];
            products.forEach(p => {
                if (!p.message) p.message = buildMessageForProduct(p);
                farmResults.push(p);
            });
            console.log(`   ✅ Farm coletados: ${farmResults.length}/${FARM_TARGET}`);
            if (scraped.stats) {
                const s = scraped.stats;
                console.log(`   📊 Stats: ${s.found} ok, ${s.notFound} não encontrados, ${s.duplicates} duplicados, ${s.errors} erros`);
            }
        }

        // ─── SCRAPE DRESSTO ───────────────────────────────────────
        if (dresstoCandidates.length > 0) {
            console.log(`\n👗 DRESSTO: Tentando ${dresstoCandidates.length} candidatos para chegar em ${DRESSTO_TARGET}...`);
            const scraped = await scrapeSpecificIdsGeneric(context, dresstoCandidates, 'dressto', DRESSTO_TARGET, { maxAgeHours: 0 });
            const products = scraped.products || [];
            products.forEach(p => {
                if (!p.message) p.message = buildMessageForProduct(p);
                dresstoResults.push(p);
            });
            console.log(`   ✅ Dressto coletados: ${dresstoResults.length}/${DRESSTO_TARGET}`);
            if (scraped.stats) {
                const s = scraped.stats;
                console.log(`   📊 Stats: ${s.found} ok, ${s.notFound} não encontrados, ${s.duplicates} duplicados, ${s.errors} erros`);
            }
        }

    } finally {
        await browser.close();
    }

    // ─── MONTAR PAYLOAD ───────────────────────────────────────────
    const finalResults = [...farmResults, ...dresstoResults];

    if (finalResults.length === 0) {
        console.log('\n⚠️ Nenhum item coletado. Nada a enviar.');
        return;
    }

    console.log(`\n📦 Total a enviar: ${finalResults.length} (Farm: ${farmResults.length}, Dressto: ${dresstoResults.length})`);

    const storesSummary = {
        farm: farmResults.length,
        dressto: dresstoResults.length
    };

    const payload = {
        timestamp: new Date().toISOString(),
        totalProducts: finalResults.length,
        products: finalResults,
        summary: {
            sent: finalResults.length,
            totalCandidates: farmCandidates.length + dresstoCandidates.length,
            novidades: 0,
            favoritos: 0,
            stores: storesSummary
        },
        type: 'daily_drive_sync'
    };

    console.log('📤 Enviando para Webhook:', WEBHOOK_URL);
    const response = await axios.post(WEBHOOK_URL, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
    });
    console.log(`✅ Webhook enviado! Status: ${response.status}`);

    // Marcar no histórico
    const sentIds = finalResults.map(p => p.id);
    markAsSent(sentIds);
    console.log(`📝 ${sentIds.length} IDs marcados no histórico.`);
}

run().catch(err => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
