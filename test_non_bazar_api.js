const axios = require('axios');

async function testApi() {
    const id = '357038_09040'; 
    const queries = [
        `ft=357038_09040`,
        `fq=productId:357038`,
        `fq=alternativeId_RefId:357038_09040`
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
