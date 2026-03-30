const axios = require('axios');

async function testApi() {
    const id = '350634_07431'; 
    // The user provided https://www.farmrio.com.br/macacao-frente-unica-pantalona-vermelho-melancia-350634-07431/p
    // Ref is likely 350634_07431 or 350634
    
    // Let's try searching by the ref from the URL
    const queries = [
        `ft=350634_07431`,
        `fq=productId:350634`,
        `fq=alternativeId_RefId:350634_07431`
    ];

    for (const q of queries) {
        try {
            const url = `https://www.farmrio.com.br/api/catalog_system/pub/products/search?${q}`;
            console.log(`Searching: ${url}`);
            const res = await axios.get(url);
            if (res.data && res.data.length > 0) {
                const p = res.data[0];
                console.log(`Name: ${p.productName}`);
                console.log(`Categories: ${JSON.stringify(p.categories)}`);
                return;
            }
        } catch (e) {
            console.error(e.message);
        }
    }
}

testApi();
