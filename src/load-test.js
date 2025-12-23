/**
 * Load Testing Script - Benchmarks all server implementations
 * Measures: Latency, throughput, concurrency handling, error rates
 * Validates: Question 8 target (<100ms latency, 1000 concurrent users)
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Test configuration
const TESTS = [
  { name: 'Basic Node.js', port: 3000, endpoint: '/api/io-bound' },
  { name: 'Cluster Node.js', port: 3001, endpoint: '/api/io-bound' },
  { name: 'Express', port: 3002, endpoint: '/api/io-bound' },
  { name: 'Basic Node.js (CPU)', port: 3000, endpoint: '/api/cpu-bound' },
  { name: 'Cluster Node.js (CPU)', port: 3001, endpoint: '/api/cpu-bound' },
];

const CONCURRENT_USERS = [10, 50, 100, 500, 1000]; // Progressive load
const REQUESTS_PER_USER = 10;

// Make HTTP request
function makeRequest(port, endpoint) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = http.get({
      hostname: 'localhost',
      port: port,
      path: endpoint,
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = performance.now() - startTime;
        resolve({ latency, statusCode: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      const latency = performance.now() - startTime;
      reject({ latency, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = performance.now() - startTime;
      reject({ latency, error: 'Timeout' });
    });
  });
}

// Run load test for specific configuration
async function runLoadTest(test, concurrentUsers) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${test.name} | Concurrent Users: ${concurrentUsers}`);
  console.log(`${'='.repeat(70)}`);

  const results = [];
  const errors = [];
  const startTime = performance.now();

  // Generate concurrent requests
  const allRequests = [];
  for (let user = 0; user < concurrentUsers; user++) {
    for (let req = 0; req < REQUESTS_PER_USER; req++) {
      allRequests.push(
        makeRequest(test.port, test.endpoint)
          .then(result => results.push(result))
          .catch(error => errors.push(error))
      );
    }
  }

  // Wait for all requests to complete
  await Promise.allSettled(allRequests);
  const totalTime = performance.now() - startTime;

  // Calculate statistics
  const latencies = results.map(r => r.latency);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
  const minLatency = Math.min(...latencies, Infinity);
  const maxLatency = Math.max(...latencies, -Infinity);
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
  const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
  const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
  
  const totalRequests = concurrentUsers * REQUESTS_PER_USER;
  const successCount = results.length;
  const errorCount = errors.length;
  const successRate = (successCount / totalRequests) * 100;
  const throughput = (successCount / (totalTime / 1000)).toFixed(2); // req/sec

  // Display results
  console.log(`\nResults:`);
  console.log(`  Total Requests: ${totalRequests}`);
  console.log(`  Successful: ${successCount} (${successRate.toFixed(1)}%)`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`  Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Throughput: ${throughput} req/sec`);
  console.log(`\nLatency Statistics:`);
  console.log(`  Average: ${avgLatency.toFixed(2)}ms`);
  console.log(`  Min: ${minLatency.toFixed(2)}ms`);
  console.log(`  Max: ${maxLatency.toFixed(2)}ms`);
  console.log(`  P50 (Median): ${p50.toFixed(2)}ms`);
  console.log(`  P95: ${p95.toFixed(2)}ms`);
  console.log(`  P99: ${p99.toFixed(2)}ms`);
  
  // Question 8 target check
  const meetsTarget = avgLatency < 100 && concurrentUsers >= 1000;
  console.log(`\nQuestion 8 Target (<100ms @ 1000 users): ${meetsTarget ? '✅ PASS' : '❌ FAIL'}`);

  if (errorCount > 0) {
    console.log(`\nError Breakdown:`);
    const errorTypes = errors.reduce((acc, err) => {
      acc[err.error] = (acc[err.error] || 0) + 1;
      return acc;
    }, {});
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  return {
    test: test.name,
    concurrentUsers,
    totalRequests,
    successCount,
    errorCount,
    successRate,
    avgLatency,
    p50,
    p95,
    p99,
    throughput,
    totalTime,
    meetsTarget
  };
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Load Test Suite');
  console.log('Testing servers against Question 8 requirements:');
  console.log('  Target: <100ms latency @ 1000 concurrent users\n');

  const allResults = [];

  for (const test of TESTS) {
    for (const concurrentUsers of CONCURRENT_USERS) {
      try {
        const result = await runLoadTest(test, concurrentUsers);
        allResults.push(result);
        
        // Wait between tests to let servers recover
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`\n❌ Test failed: ${test.name} @ ${concurrentUsers} users`);
        console.error(`Error: ${error.message}`);
      }
    }
  }

  // Summary table
  console.log(`\n\n${'='.repeat(100)}`);
  console.log('SUMMARY: All Tests');
  console.log(`${'='.repeat(100)}\n`);
  console.log('Server'.padEnd(25) + 'Users'.padEnd(10) + 'Avg Latency'.padEnd(15) + 'P95'.padEnd(12) + 'Throughput'.padEnd(15) + 'Q8 Target');
  console.log('-'.repeat(100));
  
  allResults.forEach(r => {
    console.log(
      r.test.padEnd(25) +
      r.concurrentUsers.toString().padEnd(10) +
      `${r.avgLatency.toFixed(2)}ms`.padEnd(15) +
      `${r.p95.toFixed(2)}ms`.padEnd(12) +
      `${r.throughput} req/s`.padEnd(15) +
      (r.meetsTarget ? '✅ PASS' : '❌')
    );
  });

  console.log('\n');
}

// Check if servers are running
async function checkServers() {
  console.log('Checking if servers are running...\n');
  const checks = [
    { name: 'Basic Node.js', port: 3000 },
    { name: 'Cluster Node.js', port: 3001 },
    { name: 'Express', port: 3002 }
  ];

  for (const check of checks) {
    try {
      await makeRequest(check.port, '/');
      console.log(`✅ ${check.name} (port ${check.port}): Running`);
    } catch (error) {
      console.log(`❌ ${check.name} (port ${check.port}): Not responding`);
      console.log(`   Error: ${error.error || error.message}`);
      console.log(`\n   Please start server: npm run start:* or node src/server-*.js\n`);
      process.exit(1);
    }
  }
  console.log('\nAll servers ready! Starting tests...\n');
}

// Main execution
(async () => {
  try {
    await checkServers();
    await runAllTests();
    console.log('✅ Load testing complete!\n');
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    process.exit(1);
  }
})();
