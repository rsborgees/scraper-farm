const { initBrowser } = require('../../browser_setup');
const path = require('path');
const fs = require('fs');
const { processProductUrl, processImageDirect } = require('../../imageDownloader');
const { isDuplicate, markAsSent } = require('../../historyManager');
const { parseProductDressTo, fetchViaVtexAPI } = require('./parser');

const DEBUG_DIR = path.join(__dirname, '../../debug');

/**
 * Scraper DRESS TO
 * URL: https://www.dressto.com.br/nossas-novidades
 * Quota: 18 produtos (80% vestidos, 20% macacões)
 */
async function scrapeDressTo(quota = 18, parentBrowser = null) {
    // 🛑 DRESS TO DRIVE-ONLY RULE (User Request: 2026-02-10)
    // Dress To should only be scraped via Drive-First (scrapeSpecificIdsGeneric).
    // This regular scraper function is kept for legacy/testing but should not be used in production orchestration.
    console.log('\n👗 [DRESSTO] AVISO: Esta loja está configurada para DRIVE-ONLY no orchestrator.');
    console.log('👗 INICIANDO SCRAPER REGULAR DRESS TO (Quota: ' + quota + ')');

    const products = [];
    const seenInRun = new Set();
    const { normalizeId } = require('../../historyManager');

    let browser, page;
    let shouldCloseBrowser = false;

    if (parentBrowser) {
        browser = parentBrowser;
        page = await browser.newPage();
    } else {
        ({ browser, page } = await initBrowser());
        shouldCloseBrowser = true;
    }

    // 🛡️ ANTI-REDIRECT: Enforce Brazil Region via Cookies
    await page.context().addCookies([
        {
            name: 'vtex_segment',
            value: 'eyJjdXJyZW5jeUNvZGUiOiJCUkwiLCJjb3VudHJ5Q29kZSI6IkJSQSIsImxvY2FsZUNvZGUiOiJwdC1CUiJ9',
            domain: '.dressto.com.br',
            path: '/'
        }
    ]).catch(() => { });

    try {
        let pageNum = 1;
        let consecEmptyPages = 0;
        const maxPages = 5; // Suficiente para preencher a quota de Dress To

        while (products.length < quota && pageNum <= maxPages) {
            const targetUrl = `https://www.dressto.com.br/nossas-novidades?page=${pageNum}&sc=1`;
            console.log(`   📄 Página ${pageNum}: ${targetUrl}`);

            try {
                await page.goto(targetUrl, {
                    waitUntil: 'domcontentloaded', // Relaxation: VTEX IO networkidle is too slow
                    timeout: 90000
                });

                // Pequena pausa para garantir carregamento dinâmico (VTEX)
                await page.waitForTimeout(5000);

                // 📁 CACHE DRIVE ITEMS (LOAD ONCE PER PAGE OR START)
                const { getExistingIdsFromDrive } = require('../../driveManager');
                const driveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
                let driveItems = [];
                if (driveFolderId) {
                    driveItems = await getExistingIdsFromDrive(driveFolderId, 'dressto');
                    console.log(`   📁 [DRESSTO] Cache de Drive carregado: ${driveItems.length} itens.`);
                }

                // Explicit wait for any product link to ensure page is actually ready
                try {
                    // Check for VTEX error before waiting for selectors
                    const pageTitle = await page.title().catch(() => 'unknown');
                    if (pageTitle.includes('Render Server - Error')) {
                        console.log('      ⚠️ Detectado "Render Server - Error". Recarregando página...');
                        await page.reload({ waitUntil: 'domcontentloaded' });
                        await page.waitForTimeout(5000);
                    }

                    await page.waitForSelector('a.vtex-product-summary-2-x-clearLink, a[href$="/p"], .vtex-product-summary-2-x-image', { timeout: 45000 });
                } catch (e) {
                    const pageTitle = await page.title().catch(() => 'unknown');
                    const finalUrl = page.url();
                    console.log(`      ⚠️ Timeout esperando carregamento da lista [Title: ${pageTitle}] [URL: ${finalUrl}] (tentando salvar debug)...`);
                    const debugName = `debug_dressto_fail_${pageNum}_${Date.now()}.png`;
                    await page.screenshot({ path: path.join(DEBUG_DIR, debugName) }).catch(() => { });
                    console.log(`      📸 Screenshot salvo em debug/${debugName}`);
                }

                await page.waitForTimeout(3000);

                // Scroll suave para carregar lazy elements (VTEX IO)
                await page.evaluate(async () => {
                    window.scrollBy(0, 800);
                    await new Promise(r => setTimeout(r, 1000));
                    window.scrollBy(0, 800);
                });

                // Coleta URLs de produtos
                const productUrls = await page.evaluate(() => {
                    const sel = 'a.vtex-product-summary-2-x-clearLink, a[href$="/p"], a[href*="/p?"]';
                    const links = Array.from(document.querySelectorAll(sel));
                    return [...new Set(links.map(a => a.href))]
                        .filter(url => {
                            const parsed = new URL(url);
                            return parsed.pathname.endsWith('/p') || parsed.pathname.includes('/p/');
                        });
                });

                if (productUrls.length === 0) {
                    console.log('      ⚠️ Nenhum produto encontrado nesta página via DOM. Tentando API...');

                    try {
                        const apiUrl = `https://www.dressto.com.br/api/catalog_system/pub/products/search?sc=1&_from=${(pageNum - 1) * 20}&_to=${pageNum * 20 - 1}`;
                        console.log(`      🔄 Buscando via API VTEX: ${apiUrl}`);
                        const resp = await page.context().request.get(apiUrl, {
                            headers: {
                                'Cookie': 'vtex_segment=eyJjdXJyZW5jeUNvZGUiOiJCUkwiLCJjb3VudHJ5Q29kZSI6IkJSQSIsImxvY2FsZUNvZGUiOiJwdC1CUiJ9'
                            }
                        });

                        if (resp.ok()) {
                            const json = await resp.json();
                            if (json && json.length > 0) {
                                console.log(`      ✅ API retornou ${json.length} produtos.`);
                                productUrls.push(...json.map(p => {
                                    const link = p.link || '';
                                    return link.startsWith('http') ? link : `https://www.dressto.com.br${link.startsWith('/') ? '' : '/'}${link}`;
                                }));
                            }
                        }
                    } catch (apiErr) {
                        console.log(`      ❌ Erro ao buscar via API: ${apiErr.message}`);
                    }
                }

                if (productUrls.length === 0) {
                    console.log('      ⚠️ Realmente nenhum produto encontrado nesta página.');
                    consecEmptyPages++;
                    if (consecEmptyPages >= 3) break;
                } else {
                    consecEmptyPages = 0;
                    console.log(`      🔎 Analisando ${productUrls.length} produtos na página ${pageNum}...`);

                    // Priorização de URLs por keyword
                    productUrls.sort((a, b) => {
                        const score = (url) => {
                            const lower = url.toLowerCase();
                            if (lower.includes('vestido')) return 2;
                            if (lower.includes('macacao') || lower.includes('macacão')) return 2;
                            return 0;
                        };
                        return score(b) - score(a);
                    });

                    let collectedVestidos = products.filter(p => p.categoria === 'vestido').length;
                    let collectedMacacoes = products.filter(p => p.categoria === 'macacão').length;

                    for (const url of productUrls) {
                        if (products.length >= quota) break;

                        console.log(`\n🛍️  Processando produto ${products.length + 1}/${quota}: ${url}`);

                        // Random delay entre produtos para evitar rate limit
                        await page.waitForTimeout(1500 + Math.random() * 2500);

                        // Check ID na URL
                        // Procura padrão de 8 dígitos que pode estar separado por pontos ou hífens
                        // Ex: 01.33.2394 ou 01-33-2394
                        const idMatch = url.match(/(\d{2})[.-]?(\d{2})[.-]?(\d{4})/);
                        if (idMatch) {
                            const earlyId = normalizeId(idMatch[1] + idMatch[2] + idMatch[3]);
                            if (earlyId && (seenInRun.has(earlyId) || isDuplicate(earlyId))) continue;
                        }

                        // Parse Product
                        const product = await parseProductDressTo(page, url);

                        if (product) {
                            const normId = normalizeId(product.id);
                            if (normId && (seenInRun.has(normId) || isDuplicate(normId))) continue;

                            if (normId) seenInRun.add(normId);

                            if (normId) seenInRun.add(normId);


                            // Image Download
                            console.log(`      🖼️  Baixando imagem ${product.id}...`);
                            let imagePath = null;
                            try {
                                // 1. Tenta buscar no cache do Drive carregado no início da página
                                const normId = normalizeId(product.id);
                                const driveMatch = driveItems.find(d => {
                                    // Match exato ou match normalizado
                                    return d.id === product.id || d.id === normId || (d.ids && d.ids.includes(normId));
                                });

                                if (driveMatch && driveMatch.driveUrl) {
                                    console.log(`      📁 Imagem encontrada no Drive: ${driveMatch.name}`);
                                    const imgResult = await processImageDirect(driveMatch.driveUrl, 'DRESSTO', product.id);
                                    if (imgResult?.status === 'success' && imgResult.cloudinary_urls?.length) {
                                        imagePath = imgResult.cloudinary_urls[0];
                                    }
                                }

                                // 🛑 DRESSTO DRIVE-ONLY RULE: No site fallback
                                if (!imagePath) {
                                    console.log(`      ⚠️ [DRESSTO] Imagem não encontrada no Drive para o ID ${product.id}. Pulando produto...`);
                                    continue;
                                }
                            } catch (err) {
                                console.error(`      ❌ Erro ao processar imagem: ${err.message}`);
                                continue;
                            }

                            product.loja = 'dressto';
                            product.isSiteNovidade = true;

                            // Removido logic de desconto automático de 10% porque agora o parser.js faz isso centralizado

                            product.desconto = 0; // O parser ou orchestrator pode re-calcular isso baseado no de/por
                            product.imagePath = imagePath || 'error.jpg';
                            // Removido markAsSent daqui para evitar "queimar" produtos não selecionados
                            products.push(product);

                            if (product.categoria === 'vestido') collectedVestidos++;
                            if (product.categoria === 'macacão') collectedMacacoes++;

                            console.log(`      ✅ [${products.length}/${quota}] Capturado: ${product.nome} (${product.categoria})`);
                        }
                    }
                }
            } catch (errPage) {
                console.log(`      ⚠️ Erro ao acessar página ${pageNum}: ${errPage.message}`);
                consecEmptyPages++;
            }
            pageNum++;
        }
    } catch (error) {
        console.error(`Erro no scraper Dress To: ${error.message}`);
    } finally {
        if (shouldCloseBrowser) {
            await browser.close();
        } else {
            if (page) await page.close();
        }
    }

    // Aplicar cotas internas (65% vestido, 15% macacão, 5% saia, 5% short, 5% blusa, 5% acessório)
    // Aplicar cotas internas (Regra "1 macacão e 1 vestido" se quota permitir)
    const byCategory = {};
    products.forEach(p => {
        const cat = p.categoria || 'outros';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(p);
    });

    const selectedProducts = [];
    const usedIds = new Set();

    // 1. Garante 1 Macacão
    if (byCategory['macacão'] && byCategory['macacão'].length > 0) {
        const item = byCategory['macacão'][0];
        selectedProducts.push(item);
        usedIds.add(item.id);
    }

    // 2. Garante 1 Vestido
    if (byCategory['vestido'] && byCategory['vestido'].length > 0) {
        // Pega o primeiro que não foi usado
        const item = byCategory['vestido'].find(p => !usedIds.has(p.id));
        if (item) {
            selectedProducts.push(item);
            usedIds.add(item.id);
        }
    }

    // 3. Preenche o restante da quota seguindo distribuição padrão ou aleatória
    if (selectedProducts.length < quota) {
        // Se a quota for maior que 2 (ex: 18), precisamos preencher
        // Se for exata (2), e já pegamos 1+1, ok.
        // Se faltar algum (ex: não achou macacão), precisamos completar com qualquer coisa.

        const remainingQuota = quota - selectedProducts.length;
        const pool = products.filter(p => !usedIds.has(p.id));

        // Prioridade para Vestidos depois Macacões depois o resto
        // Ordena pool: Vestido > Macacão > Outros
        pool.sort((a, b) => {
            const score = (c) => c.categoria === 'vestido' ? 3 : (c.categoria === 'macacão' ? 2 : 1);
            return score(b) - score(a);
        });

        selectedProducts.push(...pool.slice(0, remainingQuota));
    }

    // Ordenação final no output? Não necessário.

    console.log(`\n✅ Dress To Selecionados (${selectedProducts.length}):`);
    selectedProducts.forEach(p => {
        console.log(`   - ${p.nome} (${p.categoria}) | R$${p.precoAtual}`);
        markAsSent([p.id]); // Marca apenas os que serão enviados
    });

    return selectedProducts.slice(0, quota);
}

module.exports = { scrapeDressTo, parseProductDressTo, fetchViaVtexAPI };
