const autocannon = require('autocannon');
const logger = require('../utils/logger');

/**
 * Autocannon Benchmark Script
 * Simulates high concurrent load on the monitoring metrics API.
 * 
 * Run using: node tests/autocannon_benchmark.js
 */
function runBenchmark() {
  const instance = autocannon({
    url: 'http://localhost:5000/api/admin/stats',
    connections: 50, // 50 concurrent users
    pipelining: 1,
    duration: 10, // 10 seconds benchmark duration
    headers: {
      'x-monitor-token': process.env.ADMIN_MONITOR_TOKEN || ''
    }
  }, (err, result) => {
    if (err) {
      console.error('Autocannon benchmark encountered an error:', err);
      process.exit(1);
    }
    
    console.log('--- Autocannon HTTP Benchmark Results ---');
    console.log(`URL: ${result.url}`);
    console.log(`Total Requests: ${result.requests.sent}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`Max Latency: ${result.latency.max} ms`);
    console.log(`P99 Latency: ${result.latency.p99} ms`);
    console.log(`Errors (Non-2xx status codes): ${result.non2xx}`);
    console.log(`Throughput (Requests/sec): ${result.requests.average}`);
    
    // Fail benchmark if average latency > target 200ms or there are errors
    if (result.latency.average > 200) {
      console.error('FAIL: Average latency exceeds target threshold of 200ms.');
      process.exit(1);
    }
    if (result.non2xx > 0) {
      console.error('FAIL: Benchmark encountered HTTP request failures.');
      process.exit(1);
    }
    console.log('SUCCESS: API Performance conforms to baseline expectations.');
  });

  autocannon.track(instance, { renderProgressBar: true });
}

// Check if server is running before kicking off autocannon
const http = require('http');
http.get('http://localhost:5000/api/admin/stats', (res) => {
  runBenchmark();
}).on('error', () => {
  console.log('Error: QuizHive local server is not running on http://localhost:5000. Start server before running benchmark.');
});
