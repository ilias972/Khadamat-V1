const { exec } = require('child_process');

const curlCommand = `curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\\"identifier\\":\\"hassan@test.com\\",\\"password\\":\\"password123\\"}" -s -w "HTTPSTATUS:%{http_code};"`;

console.log('Testing login throttling with 10 requests (burst test)...');

let successCount = 0;
let throttleCount = 0;
let errorCount = 0;

function makeRequest(attempt) {
  return new Promise((resolve) => {
    exec(curlCommand, (error, stdout, stderr) => {
      const response = stdout;
      const statusMatch = response.match(/HTTPSTATUS:(\d+);/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
      const body = response.replace(/HTTPSTATUS:\d+;/, '');

      console.log(`Attempt ${attempt}: Status ${statusCode}`);

      if (statusCode === 200) {
        successCount++;
        console.log('  ✓ Success');
      } else if (statusCode === 429) {
        throttleCount++;
        console.log('  ✗ Throttled (429 Too Many Requests)');
      } else {
        errorCount++;
        console.log(`  ? Unexpected status: ${statusCode}`);
        console.log(`  Body: ${body}`);
      }

      resolve();
    });
  });
}

async function testBurst() {
  const startTime = Date.now();

  for (let i = 1; i <= 10; i++) {
    await makeRequest(i);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\nResults:');
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Successful logins: ${successCount}`);
  console.log(`Throttled requests: ${throttleCount}`);
  console.log(`Error requests: ${errorCount}`);

  if (successCount === 5 && throttleCount === 5) {
    console.log('✓ Burst test PASSED: 5 successful logins, 5 throttled (429 after 5 attempts)');
  } else {
    console.log('✗ Burst test FAILED');
  }
}

testBurst();