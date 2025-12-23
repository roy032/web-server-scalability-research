/**
 * Basic Node.js Server (Single-Threaded Event Loop)
 * Demonstrates: Event-driven architecture, single thread limitation
 * Expected Performance: Good for I/O-bound, limited for CPU-bound
 */

const http = require('http');
const port = 3000;

// Simulated database query (I/O-bound operation)
function simulateDBQuery() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 1, name: 'User', timestamp: Date.now() });
    }, 10); // 10ms simulated DB latency
  });
}

// CPU-intensive task (simulates compute workload like ML inference)
function cpuIntensiveTask(iterations = 1000000) {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  const startTime = Date.now();

  if (req.url === '/api/io-bound') {
    // I/O-bound endpoint (async, non-blocking)
    const data = await simulateDBQuery();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      data,
      responseTime: Date.now() - startTime,
      serverType: 'basic-nodejs',
      pid: process.pid
    }));

  } else if (req.url === '/api/cpu-bound') {
    // CPU-bound endpoint (blocks event loop!)
    const result = cpuIntensiveTask();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      result: Math.floor(result),
      responseTime: Date.now() - startTime,
      serverType: 'basic-nodejs',
      warning: 'This blocks the event loop!',
      pid: process.pid
    }));

  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      message: 'Node.js Basic Server',
      architecture: 'Single-threaded event loop',
      endpoints: ['/api/io-bound', '/api/cpu-bound'],
      pid: process.pid
    }));
  }
});

// Only start server if run directly (not imported for testing)
if (require.main === module) {
  server.listen(port, () => {
    console.log(`[Basic Node.js] Server running at http://localhost:${port}/`);
    console.log(`[Basic Node.js] PID: ${process.pid}`);
    console.log(`[Basic Node.js] Architecture: Single-threaded event loop`);
  });
}

module.exports = server;
