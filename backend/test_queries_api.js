const fetch = globalThis.fetch;

async function runTest() {
  const host = 'http://localhost:5000';
  console.log('Starting integration test for support queries...');

  try {
    // 1. Log in as trainer
    console.log('Logging in as trainer...');
    const loginTrainerRes = await fetch(`${host}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'trainer@quizhive.com', password: 'password123' })
    });
    
    if (!loginTrainerRes.ok) {
      throw new Error(`Trainer login failed with status ${loginTrainerRes.status}`);
    }
    const trainerAuth = await loginTrainerRes.json();
    const trainerToken = trainerAuth.token;
    console.log('Trainer logged in successfully.');

    // 2. Log in as admin
    console.log('Logging in as admin...');
    const loginAdminRes = await fetch(`${host}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@quizhive.com', password: 'password123' })
    });

    if (!loginAdminRes.ok) {
      throw new Error(`Admin login failed with status ${loginAdminRes.status}`);
    }
    const adminAuth = await loginAdminRes.json();
    const adminToken = adminAuth.token;
    console.log('Admin logged in successfully.');

    // 3. Post a query as trainer
    console.log('Submitting a query as trainer...');
    const submitQueryRes = await fetch(`${host}/api/users/queries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${trainerToken}`
      },
      body: JSON.stringify({
        subject: 'Test query - UI render bug',
        description: 'The progress bar is misaligned in trainer view',
        dashboard: 'Trainer Dashboard'
      })
    });

    if (!submitQueryRes.ok) {
      const errorText = await submitQueryRes.text();
      throw new Error(`Submit query failed with status ${submitQueryRes.status}: ${errorText}`);
    }
    const newQuery = await submitQueryRes.json();
    console.log(`Query submitted! ID: ${newQuery.id}, Status: ${newQuery.status}`);

    // 4. Get queries as admin
    console.log('Retrieving queries as admin...');
    const getQueriesRes = await fetch(`${host}/api/users/queries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!getQueriesRes.ok) {
      throw new Error(`Get queries failed with status ${getQueriesRes.status}`);
    }
    const queries = await getQueriesRes.json();
    const foundQuery = queries.find(q => q.id === newQuery.id);
    if (!foundQuery) {
      throw new Error('Submitted query was not found in the list of queries retrieved by admin!');
    }
    console.log(`Query found in admin list. Subject: "${foundQuery.subject}", Reporter: ${foundQuery.User?.name}`);

    // 5. Resolve query as admin
    console.log(`Resolving query ${newQuery.id} as admin...`);
    const resolveQueryRes = await fetch(`${host}/api/users/queries/${newQuery.id}/resolve`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    if (!resolveQueryRes.ok) {
      throw new Error(`Resolve query failed with status ${resolveQueryRes.status}`);
    }
    const resolvedQuery = await resolveQueryRes.json();
    console.log(`Query resolved. Updated status: ${resolvedQuery.status}`);

    // 6. Get queries again to verify status is Resolved in the database
    console.log('Verifying query status in listing...');
    const getQueriesRes2 = await fetch(`${host}/api/users/queries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const queries2 = await getQueriesRes2.json();
    const foundQuery2 = queries2.find(q => q.id === newQuery.id);
    if (!foundQuery2 || foundQuery2.status !== 'Resolved') {
      throw new Error(`Query status is not resolved. Got: ${foundQuery2 ? foundQuery2.status : 'Not found'}`);
    }
    console.log('Success! Integration test completed successfully.');
    process.exit(0);

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

runTest();
