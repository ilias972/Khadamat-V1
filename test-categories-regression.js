const axios = require('axios');

const URL = 'http://localhost:4000/api/services/categories';
const TOTAL_REQUESTS = 50;
const DELAY_MS = 100;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runRegressionTest() {
  let successful = 0;
  let failed = 0;
  let rateLimited = 0;

  console.log(`Starting regression test: ${TOTAL_REQUESTS} requests to ${URL}`);

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    try {
      const response = await axios.get(URL);
      if (response.status === 200) {
        successful++;
        console.log(`Request ${i}: 200 OK`);
      } else {
        failed++;
        console.log(`Request ${i}: ${response.status} (unexpected)`);
      }
    } catch (error) {
      if (error.response && error.response.status === 429) {
        rateLimited++;
        console.log(`Request ${i}: 429 Too Many Requests`);
      } else {
        failed++;
        console.log(`Request ${i}: Error - ${error.message}`);
      }
    }

    if (i < TOTAL_REQUESTS) {
      await delay(DELAY_MS);
    }
  }

  console.log('\n--- Test Results ---');
  console.log(`Total requests: ${TOTAL_REQUESTS}`);
  console.log(`Successful (200): ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Rate limited (429): ${rateLimited}`);

  if (rateLimited > 0) {
    throw new Error(`Regression test failed: ${rateLimited} requests were rate limited (429)`);
  }

  console.log('Regression test passed: No 429 responses detected');
}

runRegressionTest().catch(error => {
  console.error(error.message);
  process.exit(1);
});