const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_filter_today.json', 'utf8'));
    const items = data.todaysItems || [];
    
    console.log(`Iniciando verificação acelerada de ${items.length} itens...`);
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    });
    
    let discrepancies = [];
    const concurrency = 6;
    
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        
        const promises = batch.map(async (item) => {
            let page;
            try {
                page = await browser.newPage();
                
                // Fast abort images/fonts only
                await page.setRequestInterception(true);
                page.on('request', req => {
                    const t = req.resourceType();
                    if (t === 'image' || t === 'media' || t === 'font') {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
                
                await page.goto(item.linkproduto, { waitUntil: 'domcontentloaded', timeout: 35000 });
                
                // Wait smartly
                if (item.loja === 'farm') {
                    await page.waitForSelector('.vtex-store-components-3-x-skuSelectorItem, h1', { timeout: 15000 }).catch(e=>null);
                }
                
                await new Promise(r => setTimeout(r, 2000)); // Buffer
                
                let pageSizes = await page.evaluate((loja) => {
                    const getTexts = (els, notClass) => {
                        let res = [];
                        document.querySelectorAll(els).forEach(el => {
                            if (!notClass || (!el.className.includes(notClass) && !el.className.includes('disabled') && !el.className.includes('unavailable') && !el.className.includes('out-of-stock') && el.getAttribute('aria-disabled') !== 'true')) {
                                let txt = el.innerText ? el.innerText.trim() : '';
                                if(txt) res.push(txt.toUpperCase());
                            }
                        });
                        return res;
                    };
                    
                    if (loja === 'farm') {
                        // vtex-store-components-3-x-skuSelectorItem
                        let sizes = getTexts('.vtex-store-components-3-x-skuSelectorItem', 'unavailable');
                        if (sizes.length===0 && window.__STATE__) {
                            // Some themes have it in JS
                            // We would parse __STATE__ here but DOM is usually safer
                        }
                        return sizes;
                    } else if (loja === 'kju') {
                        return getTexts('.product-sizes .size-item, .variations .variation, .product-size-container label, .size-selector');
                    } else if (loja === 'dressto') {
                        return getTexts('label[for^="skus"], .skuList label');
                    }
                    return [];
                }, item.loja);
                
                // Clean and compare
                let sStr = (item.tamanhos || '').replace(/[{}]/g, '');
                let sArr = sStr ? sStr.split(',').map(s=>s.trim().toUpperCase()) : [];
                
                // Filter invalid generic text from pageSizes
                pageSizes = pageSizes.filter(s => /^(PP|P|M|G|GG|UN|ÚNICO|3[4-9]|4[0-6])$/.test(s));
                
                sArr.sort();
                pageSizes.sort();
                
                let sJoined = [...new Set(sArr)].join(',');
                let pJoined = [...new Set(pageSizes)].join(',');
                
                if (sJoined !== pJoined) {
                    discrepancies.push({
                        row: item._rowNum,
                        loja: item.loja,
                        nome: item.nome,
                        planilha: sJoined,
                        site_agora: pJoined,
                        link: item.linkproduto
                    });
                }
                
                await page.close();
            } catch (err) {
                if(page && !page.isClosed()) await page.close();
                discrepancies.push({
                    row: item._rowNum,
                    loja: item.loja,
                    nome: item.nome,
                    planilha: item.tamanhos,
                    site_agora: 'ERRO_TIMEOUT',
                    link: item.linkproduto
                });
            }
        });
        
        await Promise.all(promises);
        console.log(`Processados: ${Math.min(i + concurrency, items.length)} de ${items.length} (Encontradas ${discrepancies.length} divergências)`);
    }
    
    await browser.close();
    
    fs.writeFileSync('fast_verification.json', JSON.stringify({
        total: items.length,
        divergencias_count: discrepancies.length,
        divergencias: discrepancies
    }, null, 2));
    
    console.log("Arquivo fast_verification.json salvo!");
}

run().catch(console.error);
