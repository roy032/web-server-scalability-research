#!/usr/bin/env node

/**
 * Start all servers for benchmarking
 * This script starts each server in a child process
 */

const { spawn } = require('child_process');
const path = require('path');

const servers = [
  { name: 'Basic Node.js', script: 'src/server-basic.js', port: 3000 },
  { name: 'Cluster Node.js', script: 'src/server-cluster.js', port: 3001 },
  { name: 'Express.js', script: 'src/server-express.js', port: 3002 },
  { name: 'ML Single', script: 'src/ml-server.js', port: 3003, env: {} },
  { name: 'ML Cluster', script: 'src/ml-server.js', port: 3004, env: { CLUSTER: 'true', PORT: '3004' } }
];

const processes = [];

console.log('🚀 Starting all servers for benchmarking...\n');

servers.forEach(({ name, script, port, env = {} }) => {
  const scriptPath = path.join(__dirname, '..', script);
  const child = spawn('node', [scriptPath], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data.toString().trim()}`);
  });

  child.on('exit', (code) => {
    console.log(`[${name}] Exited with code ${code}`);
  });

  processes.push({ name, child, port });
  console.log(`✅ Started ${name} on port ${port} (PID: ${child.pid})`);
});

console.log('\n✅ All servers started!');
console.log('\n📊 Run benchmarks with: npm run benchmark');
console.log('⏹️  Press Ctrl+C to stop all servers\n');

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Stopping all servers...');
  processes.forEach(({ name, child }) => {
    console.log(`   Stopping ${name}...`);
    child.kill();
  });
  setTimeout(() => {
    console.log('✅ All servers stopped');
    process.exit(0);
  }, 1000);
});

// Keep process alive
process.stdin.resume();
