const axios = require('axios');
async function f() {
  const { data } = await axios.get('https://www.farmrio.com.br/api/catalog_system/pub/products/search?ft=358293');
  console.log(JSON.stringify(data[0], null, 2));
}
f();
