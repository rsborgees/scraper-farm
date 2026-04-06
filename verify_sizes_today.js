const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const itemsToTest = [
    {
        loja: "farm",
        nome: "Vestido Longo Estampado Araraquara",
        linkproduto: "https://secure.farmrio.com.br/vestido-longo-estampado-araraquara-araraquara_rosa-deserto-357760-55679/p?utm_campaign=7B1313",
        expectedSizes: "{GG,G}"
    },
    {
        loja: "farm",
        nome: "Vestido Longo Manga Estampado Floral Siena",
        linkproduto: "https://secure.farmrio.com.br/vestido-longo-manga-estampado-floral-siena-floral-siena_vermelho-moscato-355044-55458/p?utm_campaign=7B1313",
        expectedSizes: "{P,M,GG,G,PP}"
    },
    {
        loja: "kju",
        nome: "Garrafa Etc 650ml Semana De Arte Off White FARM ETC",
        linkproduto: "https://www.kjubrasil.com/garrafa-etc-650ml-semana-de-arte-off-white-farm-etc-inverno-2026/",
        expectedSizes: "{}"
    },
    {
        loja: "kju",
        nome: "78331227",
        linkproduto: "https://www.kjubrasil.com/busca/?q=78331227",
        expectedSizes: "{}"
    }
];

async function verifySizes() {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    for (const item of itemsToTest) {
        console.log(`\nVerificando a loja ${item.loja} - Produto: ${item.nome}`);
        console.log(`Link: ${item.linkproduto}`);
        console.log(`Tamanho Planilha: ${item.expectedSizes}`);
        
        try {
            await page.goto(item.linkproduto, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await page.waitForTimeout(3000); // Wait for sizes to render
            
            // Extract available sizes from the DOM depending on the store
            let pageSizes = [];
            
            if (item.loja === 'farm') {
                // Fetch standard VTEX sku sizes
                // Sometimes it's the element with class vtex-store-components-3-x-skuSelectorItem
                pageSizes = await page.evaluate(() => {
                    const els = document.querySelectorAll('.vtex-store-components-3-x-skuSelectorItem');
                    const available = [];
                    els.forEach(el => {
                        const isUnavailable = el.className.includes('Unavailable');
                        if (!isUnavailable) {
                            available.push(el.innerText.trim());
                        }
                    });
                    return available;
                });
            } else if (item.loja === 'kju') {
                // Kju sizes
                pageSizes = await page.evaluate(() => {
                    const els = document.querySelectorAll('.product-sizes .size-item, .variations .variation');
                    const available = [];
                    els.forEach(el => {
                        if (!el.className.includes('disabled') && !el.className.includes('out-of-stock')) {
                            available.push(el.innerText.trim());
                        }
                    });
                    return available;
                });
            }
            
            console.log(`Tamanhos Encontrados no Site: {${pageSizes.join(',')}}`);
            
        } catch (e) {
            console.log(`Erro ao carregar ou o link falhou: ${e.message}`);
        }
    }
    
    await browser.close();
}

verifySizes().catch(console.error);
