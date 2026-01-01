const Redis = require('ioredis');

const redis = new Redis('redis://localhost:6379');

async function clearThrottlerKeys() {
  const keys = await redis.keys('throttler:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log('Cleared throttler keys:', keys);
  } else {
    console.log('No throttler keys found');
  }
  redis.disconnect();
}

clearThrottlerKeys();