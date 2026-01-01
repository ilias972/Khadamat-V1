const { exec } = require('child_process');

const curlCommand = `curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\\"identifier\\":\\"hassan@test.com\\",\\"password\\":\\"password123\\"}" -s -w "HTTPSTATUS:%{http_code};"`;

console.log('Testing login throttling...');

let successCount = 0;
let failCount = 0;

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
        failCount++;
        console.log('  ✗ Throttled (429 Too Many Requests)');
      } else {
        console.log(`  ? Unexpected status: ${statusCode}`);
        console.log(`  Body: ${body}`);
      }

      resolve();
    });
  });
}

async function testThrottling() {
  for (let i = 1; i <= 6; i++) {
    await makeRequest(i);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\nResults:');
  console.log(`Successful logins: ${successCount}`);
  console.log(`Throttled requests: ${failCount}`);

  if (successCount === 5 && failCount === 1) {
    console.log('✓ Throttling test PASSED: 5 successful logins, 6th throttled');
  } else {
    console.log('✗ Throttling test FAILED');
  }
}

testThrottling();