const axios = require('axios');

async function getServiceIdAndToken() {
  const baseUrl = 'http://localhost:4000';

  try {
    // Register a pro user
    const timestamp = Date.now();
    const proData = {
      email: `test-pro-${timestamp}@example.com`,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'Pro',
      phone: `+212600${timestamp.toString().slice(-6)}`,
      role: 'PRO',
      profession: 'Plumber',
      bio: 'Professional plumber with experience'
    };

    console.log('Registering pro user...');
    const registerResponse = await axios.post(`${baseUrl}/api/auth/register`, proData);
    const token = registerResponse.data.access_token;
    console.log('✅ Pro registered and logged in, token obtained');

    // Create a service for the pro
    const serviceData = {
      categoryId: 'plomberie', // Using a known category ID from seed
      cityId: 'casablanca', // Using a known city ID from seed
      basePrice: 150,
      description: 'Test service for curl command'
    };

    console.log('Creating pro service...');
    const serviceResponse = await axios.post(`${baseUrl}/api/pro/services`, serviceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const serviceId = serviceResponse.data.id;
    console.log('✅ Service created, ID:', serviceId);

    console.log('\n=== USE THESE VALUES FOR CURL COMMAND ===');
    console.log('serviceId:', serviceId);
    console.log('token:', token);
    console.log('\nCurl command:');
    console.log(`curl -i -X PUT ${baseUrl}/api/pro/services/${serviceId} \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  --data-raw '{"isActive":false}'`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

getServiceIdAndToken();