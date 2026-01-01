const { exec } = require('child_process');

const url = 'http://localhost:4000/api/services?page=1&limit=10';

console.log('Testing 50 GET requests to /api/services...');

let successCount = 0;
let throttleCount = 0;
let errorCount = 0;

function makeRequest(attempt) {
  const curlCommand = `curl -X GET "${url}" -s -w "HTTPSTATUS:%{http_code};"`;

  return new Promise((resolve) => {
    exec(curlCommand, (error, stdout, stderr) => {
      const response = stdout;
      const statusMatch = response.match(/HTTPSTATUS:(\d+);/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;

      console.log(`Request ${attempt}: Status ${statusCode}`);

      if (statusCode === 200) {
        successCount++;
        console.log('  ✓ Success');
      } else if (statusCode === 429) {
        throttleCount++;
        console.log('  ✗ Throttled (429 Too Many Requests)');
      } else {
        errorCount++;
        console.log(`  ? Unexpected status: ${statusCode}`);
      }

      resolve();
    });
  });
}

async function test50Requests() {
  const startTime = Date.now();

  for (let i = 1; i <= 50; i++) {
    await makeRequest(i);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\nResults:');
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Successful requests: ${successCount}`);
  console.log(`Throttled requests: ${throttleCount}`);
  console.log(`Error requests: ${errorCount}`);

  // Test 2 expects 200 OK responses, some 429 acceptable if hitting default limit (200/min), but no auth throttling
  if (successCount >= 40 && throttleCount <= 10) { // Allow some throttling for default limit
    console.log('✓ Test 2 PASSED: Mostly successful requests, acceptable throttling for default limit');
  } else {
    console.log('✗ Test 2 FAILED: Too many failures or unexpected throttling');
  }
}

test50Requests();