/**
 * Advanced Benchmark Runner - Industry-grade performance testing
 * Exports results to CSV/JSON for analysis and visualization
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  servers: [
    { name: 'Basic Node.js (I/O)', port: 3000, endpoint: '/api/io-bound', type: 'io' },
    { name: 'Cluster Node.js (I/O)', port: 3001, endpoint: '/api/io-bound', type: 'io' },
    { name: 'Express (I/O)', port: 3002, endpoint: '/api/io-bound', type: 'io' },
    { name: 'Basic Node.js (CPU)', port: 3000, endpoint: '/api/cpu-bound', type: 'cpu' },
    { name: 'Cluster Node.js (CPU)', port: 3001, endpoint: '/api/cpu-bound', type: 'cpu' },
  ],
  concurrentUsers: [10, 25, 50, 100, 250, 500, 750, 1000],
  requestsPerUser: 10,
  warmupRuns: 2,
  benchmarkRuns: 3,
  timeout: 10000,
  outputDir: './results',
};

const EXPORT_FORMAT = process.argv.includes('--export') ? 'all' : 'console';
const QUICK_MODE = process.argv.includes('--quick');

if (QUICK_MODE) {
  CONFIG.concurrentUsers = [10, 50, 100, 500, 1000];
  CONFIG.benchmarkRuns = 1;
}

// Utility: Make HTTP request
function makeRequest(port, endpoint, timeout = CONFIG.timeout) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const req = http.get(
      {
        hostname: 'localhost',
        port,
        path: endpoint,
        timeout,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          const latency = performance.now() - startTime;
          resolve({ latency, statusCode: res.statusCode, data });
        });
      }
    );

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

// Calculate statistics
function calculateStats(latencies) {
  if (latencies.length === 0) return null;

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);

  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
    median: sorted[Math.floor(sorted.length * 0.5)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p90: sorted[Math.floor(sorted.length * 0.90)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
    stdDev: Math.sqrt(
      sorted.reduce((sq, n) => sq + (n - sum / sorted.length) ** 2, 0) / sorted.length
    ),
  };
}

// Run single benchmark
async function runBenchmark(server, concurrentUsers) {
  const results = [];
  const errors = [];
  const startTime = performance.now();

  const allRequests = [];
  for (let user = 0; user < concurrentUsers; user++) {
    for (let req = 0; req < CONFIG.requestsPerUser; req++) {
      allRequests.push(
        makeRequest(server.port, server.endpoint)
          .then((result) => results.push(result))
          .catch((error) => errors.push(error))
      );
    }
  }

  await Promise.allSettled(allRequests);
  const totalTime = performance.now() - startTime;

  const latencies = results.map((r) => r.latency);
  const stats = calculateStats(latencies);

  const totalRequests = concurrentUsers * CONFIG.requestsPerUser;
  const successRate = (results.length / totalRequests) * 100;
  const throughput = results.length / (totalTime / 1000);

  return {
    server: server.name,
    type: server.type,
    concurrentUsers,
    totalRequests,
    successCount: results.length,
    errorCount: errors.length,
    successRate,
    throughput,
    totalTime,
    stats,
    meetsQ8Target: stats && stats.avg < 100 && concurrentUsers >= 1000,
    timestamp: new Date().toISOString(),
  };
}

// Run multiple iterations and average
async function runMultipleIterations(server, concurrentUsers) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Server: ${server.name} | Users: ${concurrentUsers} | Iterations: ${CONFIG.benchmarkRuns}`);
  console.log('='.repeat(80));

  const iterations = [];

  // Warmup
  console.log('Warming up...');
  for (let i = 0; i < CONFIG.warmupRuns; i++) {
    await runBenchmark(server, Math.min(concurrentUsers, 50));
  }

  // Actual benchmark runs
  for (let i = 0; i < CONFIG.benchmarkRuns; i++) {
    console.log(`Run ${i + 1}/${CONFIG.benchmarkRuns}...`);
    const result = await runBenchmark(server, concurrentUsers);
    iterations.push(result);
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Cool-down
  }

  // Average results
  const avgResult = {
    ...iterations[0],
    successRate: iterations.reduce((sum, r) => sum + r.successRate, 0) / iterations.length,
    throughput: iterations.reduce((sum, r) => sum + r.throughput, 0) / iterations.length,
    totalTime: iterations.reduce((sum, r) => sum + r.totalTime, 0) / iterations.length,
    stats: {
      avg: iterations.reduce((sum, r) => sum + r.stats.avg, 0) / iterations.length,
      median: iterations.reduce((sum, r) => sum + r.stats.median, 0) / iterations.length,
      p95: iterations.reduce((sum, r) => sum + r.stats.p95, 0) / iterations.length,
      p99: iterations.reduce((sum, r) => sum + r.stats.p99, 0) / iterations.length,
      min: Math.min(...iterations.map((r) => r.stats.min)),
      max: Math.max(...iterations.map((r) => r.stats.max)),
    },
    iterations: iterations.length,
  };

  // Display results
  console.log('\nResults (averaged over', iterations.length, 'runs):');
  console.log(`  Success Rate: ${avgResult.successRate.toFixed(1)}%`);
  console.log(`  Throughput: ${avgResult.throughput.toFixed(2)} req/sec`);
  console.log(`  Latency: ${avgResult.stats.avg.toFixed(2)}ms avg, ${avgResult.stats.p95.toFixed(2)}ms p95`);
  console.log(`  Question 8 Target: ${avgResult.meetsQ8Target ? '✅ PASS' : '❌ FAIL'}`);

  return avgResult;
}

// Export results to files
function exportResults(allResults) {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];

  // Export JSON
  const jsonPath = path.join(CONFIG.outputDir, `benchmark-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));
  console.log(`\n✅ JSON results saved to: ${jsonPath}`);

  // Export CSV
  const csvPath = path.join(CONFIG.outputDir, `benchmark-${timestamp}.csv`);
  const csvHeaders = 'Server,Type,Users,SuccessRate,Throughput,AvgLatency,P95,P99,Q8Pass\n';
  const csvRows = allResults
    .map(
      (r) =>
        `"${r.server}",${r.type},${r.concurrentUsers},${r.successRate.toFixed(1)},${r.throughput.toFixed(2)},${r.stats.avg.toFixed(2)},${r.stats.p95.toFixed(2)},${r.stats.p99.toFixed(2)},${r.meetsQ8Target ? '1' : '0'}`
    )
    .join('\n');
  fs.writeFileSync(csvPath, csvHeaders + csvRows);
  console.log(`✅ CSV results saved to: ${csvPath}`);

  // Export summary
  const summaryPath = path.join(CONFIG.outputDir, `summary-${timestamp}.txt`);
  let summary = 'WEB SERVER SCALABILITY BENCHMARK RESULTS\n';
  summary += '='.repeat(100) + '\n\n';
  summary += `Timestamp: ${new Date().toISOString()}\n`;
  summary += `Total Tests: ${allResults.length}\n`;
  summary += `Configuration: ${CONFIG.benchmarkRuns} runs per test, ${CONFIG.requestsPerUser} requests per user\n\n`;
  summary += 'Question 8 Target: <100ms latency @ 1000 concurrent users\n\n';
  summary += '='.repeat(100) + '\n\n';
  
  summary += 'Server'.padEnd(30) + 'Users'.padEnd(10) + 'Avg(ms)'.padEnd(12) + 'P95(ms)'.padEnd(12) + 'RPS'.padEnd(15) + 'Q8\n';
  summary += '-'.repeat(100) + '\n';
  
  allResults.forEach((r) => {
    summary += r.server.padEnd(30);
    summary += r.concurrentUsers.toString().padEnd(10);
    summary += r.stats.avg.toFixed(2).padEnd(12);
    summary += r.stats.p95.toFixed(2).padEnd(12);
    summary += r.throughput.toFixed(1).padEnd(15);
    summary += (r.meetsQ8Target ? '✅' : '❌') + '\n';
  });

  fs.writeFileSync(summaryPath, summary);
  console.log(`✅ Summary saved to: ${summaryPath}\n`);
}

// Main execution
async function main() {
  console.log('\n🚀 Advanced Benchmark Suite');
  console.log('Testing web server parallel scalability\n');
  console.log(`Mode: ${QUICK_MODE ? 'QUICK' : 'FULL'}`);
  console.log(`Export: ${EXPORT_FORMAT}\n`);

  const allResults = [];

  for (const server of CONFIG.servers) {
    for (const users of CONFIG.concurrentUsers) {
      try {
        const result = await runMultipleIterations(server, users);
        allResults.push(result);
      } catch (error) {
        console.error(`\n❌ Test failed: ${server.name} @ ${users} users`);
        console.error(`Error: ${error.message}`);
      }
    }
  }

  // Display summary
  console.log('\n\n' + '='.repeat(100));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(100) + '\n');
  console.log('Server'.padEnd(30) + 'Users'.padEnd(10) + 'Avg Latency'.padEnd(15) + 'P95'.padEnd(12) + 'Throughput'.padEnd(15) + 'Q8');
  console.log('-'.repeat(100));

  allResults.forEach((r) => {
    console.log(
      r.server.padEnd(30) +
        r.concurrentUsers.toString().padEnd(10) +
        `${r.stats.avg.toFixed(2)}ms`.padEnd(15) +
        `${r.stats.p95.toFixed(2)}ms`.padEnd(12) +
        `${r.throughput.toFixed(1)} req/s`.padEnd(15) +
        (r.meetsQ8Target ? '✅' : '❌')
    );
  });

  if (EXPORT_FORMAT !== 'console') {
    exportResults(allResults);
  }

  console.log('\n✅ Benchmarking complete!\n');
}

main().catch(console.error);
