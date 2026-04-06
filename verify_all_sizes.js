const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function run() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_filter_today.json', 'utf8'));
    const items = data.todaysItems || [];
    
    console.log(`Iniciando verificação de ${items.length} itens... Isso pode levar alguns minutos.`);
    
    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    // Process in batches
    const limit = 5;
    const results = [];
    let discrepancies = [];
    
    for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        const promises = batch.map(async (item) => {
            let page;
            try {
                page = await browser.newPage();
                // Block heavy resources
                // Removed interception completely for accuracy
                
                await page.goto(item.linkproduto, { waitUntil: 'domcontentloaded', timeout: 25000 });
                await new Promise(r => setTimeout(r, 4500));
                
                let pageSizes = [];
                if (item.loja === 'farm') {
                    // Tenta achar com classe do VTEX
                    pageSizes = await page.evaluate(() => {
                        const els = document.querySelectorAll('.vtex-store-components-3-x-skuSelectorItem');
                        const available = [];
                        els.forEach(el => {
                            if (!el.className.includes('Unavailable')) {
                                const text = el.innerText.trim();
                                if(text) available.push(text);
                            }
                        });
                        return available;
                    });
                } else if (item.loja === 'kju') {
                    // Kju
                    pageSizes = await page.evaluate(() => {
                        const els = document.querySelectorAll('.product-sizes .size-item:not(.out-of-stock):not(.disabled), .variations .variation:not(.out-of-stock), .product-size-container label:not(.unavailable)');
                        const available = [];
                        els.forEach(el => {
                            const text = el.innerText.trim();
                            if(text) available.push(text);
                        });
                        return available;
                    });
                } else if (item.loja === 'dressto') {
                    pageSizes = await page.evaluate(() => {
                        const els = document.querySelectorAll('.product-sizes label:not(.unavailable), .skuList label:not(.item_unavailable)');
                        const available = [];
                        els.forEach(el => {
                            const text = el.innerText.trim();
                            if(text) available.push(text);
                        });
                        return available;
                    });
                }
                
                let spreadsheetSizesStr = item.tamanhos.replace(/[{}]/g, '');
                let spreadsheetSizesArr = spreadsheetSizesStr ? spreadsheetSizesStr.split(',').map(s=>s.trim()) : [];
                
                // Compare them
                spreadsheetSizesArr.sort();
                pageSizes.sort();
                
                const sStr = spreadsheetSizesArr.join(',');
                const pStr = pageSizes.join(',');
                
                let isMatch = (sStr === pStr);
                
                if (!isMatch) {
                    discrepancies.push({
                        row: item._rowNum,
                        loja: item.loja,
                        nome: item.nome,
                        planilha: sStr,
                        site_agora: pStr,
                        link: item.linkproduto
                    });
                }
                
                results.push({ item: item.nome, isMatch, planilha: sStr, site: pStr });
                
                await page.close();
            } catch (error) {
                console.error(`Erro no item ${item.nome}: ${error.message}`);
                discrepancies.push({
                    row: item._rowNum,
                    loja: item.loja,
                    nome: item.nome,
                    planilha: item.tamanhos,
                    site_agora: `ERRO DE CARREGAMENTO`,
                    link: item.linkproduto
                });
                if(page && !page.isClosed()) await page.close();
            }
        });
        
        await Promise.all(promises);
        console.log(`Processados ${Math.min(i + limit, items.length)} de ${items.length}`);
    }
    
    await browser.close();
    
    console.log(`\nFinalizado! Total Discrepâncias: ${discrepancies.length}`);
    
    const output = {
        totalVerificados: items.length,
        discrepanciasEncontradas: discrepancies.length,
        discrepanciasDetalhes: discrepancies
    };
    
    fs.writeFileSync('all_sizes_verification.json', JSON.stringify(output, null, 2));
    console.log("Arquivo 'all_sizes_verification.json' salvo com o resultado completo.");
}

run().catch(console.error);
