const fs = require('fs');
const { parseProduct } = require('./productParser.js');
// productParser requires browser_setup internally

async function run() {
    const data = JSON.parse(fs.readFileSync('spreadsheet_filter_today.json', 'utf8'));
    const items = data.todaysItems || [];
    
    console.log(`Iniciando verificação de ${items.length} itens usando o productParser interno...`);
    
    const results = [];
    let discrepancies = [];
    let kjuDresstoManual = [];
    
    // Process sequentially or with limit
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`Processando ${i+1}/${items.length}: ${item.nome} (${item.loja})`);
        
        if (item.loja === 'farm' || item.loja === 'dressto' || item.loja === 'zzmall') {
            try {
                const parsed = await parseProduct(item.linkproduto);
                let pageSizes = parsed ? parsed.tamanhos : [];
                
                let spreadsheetSizesStr = item.tamanhos.replace(/[{}]/g, '');
                let spreadsheetSizesArr = spreadsheetSizesStr ? spreadsheetSizesStr.split(',').map(s=>s.trim()) : [];
                
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
            } catch (e) {
                console.error(`Erro:`, e.message);
                discrepancies.push({
                    row: item._rowNum,
                    nome: item.nome,
                    erro: 'Erro ao carregar',
                    link: item.linkproduto
                });
            }
        } else {
            // Kju or others not supported by general parser maybe
            kjuDresstoManual.push(item);
        }
    }
    
    console.log(`\nFinalizado! Total Discrepâncias Farm/Dressto: ${discrepancies.length}`);
    
    const output = {
        totalVerificados: items.length,
        discrepanciasEncontradas: discrepancies.length,
        kjuPendentes: kjuDresstoManual.length,
        discrepanciasDetalhes: discrepancies
    };
    
    fs.writeFileSync('all_sizes_verification_v2.json', JSON.stringify(output, null, 2));
    console.log("Arquivo 'all_sizes_verification_v2.json' salvo.");
    
    process.exit(0);
}

run().catch(console.error);
