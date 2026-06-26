const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@idonneous.com',
      password: 'admin123'
    });
    const token = res.data.token;
    console.log('Login success');
    
    const createRes = await axios.post('http://localhost:5000/api/users', {
      name: 'Test Agent User',
      email: 'agent_test_123@example.com',
      roleName: 'Employee',
      employee_id: ''
    }, {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('Create success:', createRes.data.id);
  } catch (err) {
    console.error('Create error:', err.response ? err.response.data : err.message);
  }
}
test();
