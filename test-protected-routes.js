const axios = require('axios');

async function testProtectedRoutes() {
  console.log('🧪 Testing Protected Routes with JWT...');

  try {
    // First, register a new user
    const timestamp = Date.now();
    const email = `test-protected-${timestamp}@test.com`;
    const registerResponse = await axios.post('http://localhost:4000/api/auth/register', {
      email: email,
      password: 'Test123!',
      firstName: 'Test',
      lastName: 'User',
      phone: `+212600${timestamp.toString().slice(-6)}`,
      role: 'CLIENT'
    });

    const token = registerResponse.data.access_token;
    console.log('✅ Register and login successful, got token');

    // Now test protected route
    const profileResponse = await axios.get('http://localhost:4000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Protected route access successful');
    console.log('User profile:', profileResponse.data);

    // Test without token (should fail)
    try {
      await axios.get('http://localhost:4000/api/user/profile');
      console.log('❌ Should have failed without token');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected without token (401 Unauthorized)');
      } else {
        console.log('❌ Unexpected error without token:', error.response?.status);
      }
    }

    console.log('🎉 Protected routes test passed!');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testProtectedRoutes();