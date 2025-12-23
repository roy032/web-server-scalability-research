/**
 * Express.js Server with Middleware Pipeline
 * Demonstrates: Middleware overhead, routing complexity, async handlers
 * Expected Performance: Similar to Node.js but with middleware processing time
 */

const express = require('express');
const app = express();
const port = 3002;

// In-memory cache (simulates application-level caching from case study)
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds

// Middleware: Request logger
app.use((req, res, next) => {
  req.startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - PID: ${process.pid}`);
  next();
});

// Middleware: Response time header
app.use((req, res, next) => {
  res.on('finish', () => {
    const responseTime = Date.now() - req.startTime;
    console.log(`  → Response time: ${responseTime}ms`);
  });
  next();
});

// Middleware: Compression (simulated)
app.use((req, res, next) => {
  res.setHeader('X-Compression', 'gzip');
  next();
});

// Simulated database query
async function simulateDBQuery() {
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

// Route: I/O-bound with caching (from case study optimization)
app.get('/api/io-bound', async (req, res) => {
  const cacheKey = 'io-bound-data';
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Cache hit (50% latency reduction as per case study)
    return res.json({
      data: cached.data,
      responseTime: Date.now() - req.startTime,
      serverType: 'express-nodejs',
      cacheHit: true,
      pid: process.pid
    });
  }

  // Cache miss - query database
  const data = await simulateDBQuery();
  cache.set(cacheKey, { data, timestamp: Date.now() });

  res.json({
    data,
    responseTime: Date.now() - req.startTime,
    serverType: 'express-nodejs',
    cacheHit: false,
    pid: process.pid
  });
});

// Route: CPU-bound (async handler)
app.get('/api/cpu-bound', async (req, res) => {
  const result = cpuIntensiveTask();
  res.json({
    result: Math.floor(result),
    responseTime: Date.now() - req.startTime,
    serverType: 'express-nodejs',
    middlewareCount: app._router.stack.length,
    pid: process.pid
  });
});

// Route: Root
app.get('/', (req, res) => {
  res.json({
    message: 'Express.js Server',
    architecture: 'Middleware pipeline on Node.js event loop',
    middlewareCount: app._router.stack.length,
    cacheSize: cache.size,
    endpoints: ['/api/io-bound', '/api/cpu-bound'],
    pid: process.pid
  });
});

// Cache cleanup interval
setInterval(() => {
  const now = Date.now();
  for (let [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 30000);

// Only start server if run directly (not imported for testing)
if (require.main === module) {
  app.listen(port, () => {
    console.log(`[Express] Server running at http://localhost:${port}/`);
    console.log(`[Express] PID: ${process.pid}`);
    console.log(`[Express] Middleware count: ${app._router.stack.length}`);
    console.log(`[Express] Caching enabled (TTL: ${CACHE_TTL}ms)`);
  });
}

module.exports = app;
