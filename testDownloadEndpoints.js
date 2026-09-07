const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { JWT_SECRET } = require('./backend/config/constants');
const Certificate = require('./backend/models/Certificate');
const sequelize = require('./backend/config/database');

async function test() {
  try {
    await sequelize.authenticate();
    const cert = await Certificate.findOne();
    if (!cert) {
      console.log('No certificate found in database to test.');
      process.exit(0);
    }

    console.log(`Found test certificate: ${cert.certificate_id} (ID: ${cert.id})`);

    const token = jwt.sign({ id: 'admin-1', role: 'Super Admin', name: 'Super Admin' }, JWT_SECRET, { expiresIn: '1d' });

    // Test 1: Direct GET without auth header or query token (Public Download)
    console.log('\n--- Test 1: Public Download (No Auth Header/Token) ---');
    try {
      const res1 = await fetch(`http://localhost:5000/api/certificates/${cert.id}/download`);
      const buf1 = await res1.arrayBuffer();
      console.log(`✅ Test 1 Passed! Status: ${res1.status}, Content-Type: ${res1.headers.get('content-type')}, Size: ${buf1.byteLength} bytes`);
    } catch (e) {
      console.error('❌ Test 1 Failed:', e.message);
    }

    // Test 2: GET with query token (?token=...)
    console.log('\n--- Test 2: Query Token Download (?token=...) ---');
    try {
      const res2 = await fetch(`http://localhost:5000/api/certificates/${cert.id}/download?token=${token}`);
      const buf2 = await res2.arrayBuffer();
      console.log(`✅ Test 2 Passed! Status: ${res2.status}, Content-Type: ${res2.headers.get('content-type')}, Size: ${buf2.byteLength} bytes`);
    } catch (e) {
      console.error('❌ Test 2 Failed:', e.message);
    }

    // Test 3: GET with Authorization Header
    console.log('\n--- Test 3: Authorization Header Download ---');
    try {
      const res3 = await fetch(`http://localhost:5000/api/certificates/${cert.id}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const buf3 = await res3.arrayBuffer();
      console.log(`✅ Test 3 Passed! Status: ${res3.status}, Content-Type: ${res3.headers.get('content-type')}, Size: ${buf3.byteLength} bytes`);
    } catch (e) {
      console.error('❌ Test 3 Failed:', e.message);
    }

    process.exit(0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

test();
