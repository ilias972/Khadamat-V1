const { exec } = require('child_process');

const curlCommand = `curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\\"identifier\\":\\"jean.client@test.com\\",\\"password\\":\\"password123\\"}" -s`;

console.log('Testing JWT expiration...');

exec(curlCommand, (error, stdout, stderr) => {
  console.log('Response:', stdout);
  try {
    const response = JSON.parse(stdout);
    const token = response.access_token;

    if (!token) {
      console.log('✗ No token received');
      return;
    }

    // Decode JWT payload (second part)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log('✗ Invalid JWT format');
      return;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    const iat = payload.iat;
    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    console.log(`Token issued at: ${new Date(iat * 1000).toISOString()}`);
    console.log(`Token expires at: ${new Date(exp * 1000).toISOString()}`);
    console.log(`Current time: ${new Date(now * 1000).toISOString()}`);

    const duration = exp - iat;
    const expectedDuration = 15 * 60; // 15 minutes in seconds

    console.log(`Token duration: ${duration} seconds (${duration / 60} minutes)`);
    console.log(`Expected duration: ${expectedDuration} seconds (${expectedDuration / 60} minutes)`);

    if (Math.abs(duration - expectedDuration) <= 1) { // Allow 1 second tolerance
      console.log('✓ JWT expiration is correctly set to 15 minutes');
    } else {
      console.log('✗ JWT expiration duration is incorrect');
    }

    // Check if token is not expired yet
    if (exp > now) {
      console.log('✓ Token is not expired');
    } else {
      console.log('✗ Token is already expired');
    }

  } catch (e) {
    console.log('✗ Failed to parse response or token:', e.message);
    console.log('Response:', stdout);
  }
});