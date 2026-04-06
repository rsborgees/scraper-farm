const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    console.log("Iniciando verificação de todas as 120 peças de hoje de forma confiável...");
    const data = JSON.parse(fs.readFileSync('spreadsheet_filter_today.json', 'utf8'));
    const items = data.todaysItems || [];
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    let discrepancies = [];
    let checked = 0;
    
    const concurrency = 6;
    for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        
        await Promise.all(batch.map(async (item) => {
            let page;
            try {
                page = await browser.newPage();
                
                // Bypass block without filtering vtex js
                await page.setRequestInterception(true);
                page.on('request', req => {
                    const t = req.resourceType();
                    if (t === 'image' || t === 'media') {
                        req.abort();
                    } else {
                        req.continue();
                    }
                });
                
                await page.goto(item.linkproduto, { waitUntil: 'domcontentloaded', timeout: 35000 });
                
                // Extrair tamanhos com paciência
                let pageSizes = [];
                
                if (item.loja === 'farm') {
                    await page.waitForSelector('.vtex-store-components-3-x-skuSelectorItem, h1', { timeout: 15000 }).catch(() => {});
                    // Wait extra 3s for react to render SKUs after skeleton
                    await new Promise(r => setTimeout(r, 4000));
                    
                    pageSizes = await page.evaluate(() => {
                        let sizes = [];
                        document.querySelectorAll('.vtex-store-components-3-x-skuSelectorItem').forEach(el => {
                            if (!el.className.includes('unavailable') && !el.className.includes('disable')) {
                                let txt = el.innerText ? el.innerText.trim() : '';
                                if(txt) sizes.push(txt.toUpperCase());
                            }
                        });
                        return sizes;
                    });
                } else if (item.loja === 'kju') {
                    await new Promise(r => setTimeout(r, 4000));
                    pageSizes = await page.evaluate(() => {
                        let sizes = [];
                        document.querySelectorAll('.product-sizes .size-item:not(.out-of-stock), .variations .variation:not(.out-of-stock)').forEach(el => {
                            let txt = el.innerText ? el.innerText.trim() : '';
                            if(txt) sizes.push(txt.toUpperCase());
                        });
                        return sizes;
                    });
                } else if (item.loja === 'dressto') {
                    await new Promise(r => setTimeout(r, 4000));
                    pageSizes = await page.evaluate(() => {
                        let sizes = [];
                        document.querySelectorAll('.product-sizes label:not(.unavailable), .skuList label:not(.item_unavailable)').forEach(el => {
                            let txt = el.innerText ? el.innerText.trim() : '';
                            if(txt) sizes.push(txt.toUpperCase());
                        });
                        return sizes;
                    });
                }
                
                // Normaliza e compara
                pageSizes = pageSizes.filter(s => /^(PP|P|M|G|GG|UN|ÚNICO|3[4-9]|4[0-6])$/i.test(s));
                
                let sStr = (item.tamanhos || '').replace(/[{}]/g, '');
                let sArr = sStr ? sStr.split(',').map(s=>s.trim().toUpperCase()) : [];
                
                let sJoined = [...new Set(sArr)].sort().join(',');
                let pJoined = [...new Set(pageSizes)].sort().join(',');
                
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
                checked++;
            } catch (err) {
                checked++;
                discrepancies.push({
                    row: item._rowNum,
                    loja: item.loja,
                    nome: item.nome,
                    planilha: item.tamanhos,
                    site_agora: 'ERRO/TIMEOUT',
                    link: item.linkproduto
                });
            } finally {
                if (page && !page.isClosed()) await page.close();
            }
        }));
        
        console.log(`Progresso: ${checked}/${items.length} (Divergências atuais: ${discrepancies.length})`);
    }
    
    await browser.close();
    
    fs.writeFileSync('perfect_verification.json', JSON.stringify({
        total: items.length,
        divergencias_count: discrepancies.length,
        divergencias: discrepancies
    }, null, 2));
    
    console.log("Arquivo perfect_verification.json salvo!");
}

run().catch(console.error);
