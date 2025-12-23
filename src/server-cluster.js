/**
 * Node.js Cluster Mode Server (Multi-Process)
 * Demonstrates: Cluster module, multi-core utilization, process isolation
 * Expected Performance: Linear scaling with CPU cores, no shared memory
 */

const cluster = require('cluster');
const http = require('http');
const os = require('os');

const numCPUs = os.cpus().length;
const port = 3001;

// Simulated database query
function simulateDBQuery() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ id: 1, name: 'User', timestamp: Date.now() });
    }, 10);
  });
}

// CPU-intensive task
function cpuIntensiveTask(iterations = 1000000) {
  let result = 0;
  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i);
  }
  return result;
}

if (cluster.isMaster) {
  console.log(`[Cluster Master] PID: ${process.pid}`);
  console.log(`[Cluster Master] CPUs detected: ${numCPUs}`);
  console.log(`[Cluster Master] Spawning ${numCPUs} worker processes...`);

  // Fork workers (one per CPU core)
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`[Cluster Master] Worker ${i + 1} spawned (PID: ${worker.process.pid})`);
  }

  // Handle worker crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[Cluster Master] Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

  // Performance stats
  let requestCount = 0;
  setInterval(() => {
    console.log(`[Cluster Master] Total requests handled: ${requestCount}`);
  }, 5000);

  cluster.on('message', (worker, message) => {
    if (message.cmd === 'request') {
      requestCount++;
    }
  });

} else {
  // Worker process - handles actual requests
  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();

    // Notify master of request (for stats)
    process.send({ cmd: 'request' });

    if (req.url === '/api/io-bound') {
      const data = await simulateDBQuery();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data,
        responseTime: Date.now() - startTime,
        serverType: 'cluster-nodejs',
        workerPID: process.pid,
        totalWorkers: numCPUs
      }));

    } else if (req.url === '/api/cpu-bound') {
      const result = cpuIntensiveTask();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        result: Math.floor(result),
        responseTime: Date.now() - startTime,
        serverType: 'cluster-nodejs',
        workerPID: process.pid,
        totalWorkers: numCPUs,
        note: 'Distributed across workers'
      }));

    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'Node.js Cluster Server',
        architecture: `Multi-process (${numCPUs} workers)`,
        endpoints: ['/api/io-bound', '/api/cpu-bound'],
        workerPID: process.pid
      }));
    }
  });

  server.listen(port, () => {
    console.log(`[Worker ${process.pid}] Listening on port ${port}`);
  });
}
