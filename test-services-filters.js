const { exec } = require('child_process');

const baseUrl = 'http://localhost:4000/api/services';

// Array of different filter combinations
const filters = [
  '?page=1&limit=10',
  '?page=2&limit=10',
  '?q=plumbing',
  '?categoryId=1',
  '?cityId=1',
  '?minPrice=100',
  '?maxPrice=500',
  '?minRating=4',
  '?verified=true',
  '?premium=true',
  '?sort=price&order=asc',
  '?sort=rating&order=desc',
  '?page=3&limit=5',
  '?q=electrician',
  '?categoryId=2',
  '?cityId=2',
  '?minPrice=200',
  '?maxPrice=1000',
  '?minRating=3',
  '?verified=false',
  '?premium=false',
  '?sort=name&order=asc',
  '?page=4&limit=20',
  '?q=cleaning',
  '?categoryId=3',
  '?cityId=3',
  '?minPrice=50',
  '?maxPrice=300',
  '?minRating=5',
  '?sort=createdAt&order=desc',
];

console.log('Testing services filters throttling (30 requests in <1 minute)...');

let successCount = 0;
let throttleCount = 0;
let errorCount = 0;
let headersChecked = false;

function makeRequest(index) {
  const filter = filters[index % filters.length];
  const url = `${baseUrl}${filter}`;
  const curlCommand = `curl -X GET "${url}" -s -w "HTTPSTATUS:%{http_code};HEADERS:%{header_json};"`;

  return new Promise((resolve) => {
    exec(curlCommand, (error, stdout, stderr) => {
      const response = stdout;
      const statusMatch = response.match(/HTTPSTATUS:(\d+);/);
      const statusCode = statusMatch ? parseInt(statusMatch[1]) : null;
      const headersMatch = response.match(/HEADERS:(.*);/);
      const headers = headersMatch ? JSON.parse(headersMatch[1]) : {};

      console.log(`Request ${index + 1}: ${filter} - Status ${statusCode}`);

      if (!headersChecked && index === 0) {
        console.log('Checking headers for Retry-After-auth...');
        if (headers['retry-after-auth']) {
          console.log('  ⚠️  Found Retry-After-auth header:', headers['retry-after-auth']);
        } else {
          console.log('  ✓  No Retry-After-auth header found');
        }
        headersChecked = true;
      }

      if (statusCode === 200) {
        successCount++;
        console.log('  ✓ Success');
      } else if (statusCode === 429) {
        throttleCount++;
        console.log('  ✗ Throttled (429 Too Many Requests)');
        if (headers['retry-after']) {
          console.log(`    Retry-After: ${headers['retry-after']}`);
        }
      } else {
        errorCount++;
        console.log(`  ? Unexpected status: ${statusCode}`);
      }

      resolve();
    });
  });
}

async function testFilters() {
  const startTime = Date.now();

  for (let i = 0; i < 30; i++) {
    await makeRequest(i);
    // Small delay to simulate rapid but not instantaneous requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log('\nResults:');
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Successful requests: ${successCount}`);
  console.log(`Throttled requests: ${throttleCount}`);
  console.log(`Error requests: ${errorCount}`);

  if (throttleCount === 0 && duration < 60) {
    console.log('✓ Test 1 PASSED: No throttling on 30 filter changes in <1 minute');
  } else {
    console.log('✗ Test 1 FAILED: Throttling occurred or took too long');
  }
}

testFilters();