/**
 * AI/ML Inference Server - Demonstrates CPU-bound workload scalability
 * Uses TensorFlow.js for image classification (MobileNet)
 * Shows difference between basic server vs cluster mode for ML workloads
 */

const http = require('http');
const cluster = require('cluster');
const os = require('os');

// Simulated ML inference (replace with real TensorFlow.js if needed)
class MLModel {
  constructor() {
    this.modelName = 'MobileNet-v2';
    this.loaded = false;
  }

  async load() {
    // Simulate model loading time
    return new Promise((resolve) => {
      setTimeout(() => {
        this.loaded = true;
        console.log(`[ML Model] ${this.modelName} loaded`);
        resolve();
      }, 100);
    });
  }

  // Simulated inference (CPU-intensive computation)
  async predict(imageData) {
    if (!this.loaded) {
      throw new Error('Model not loaded');
    }

    const startTime = Date.now();

    // Simulate CNN forward pass (matrix operations)
    let result = 0;
    for (let layer = 0; layer < 53; layer++) { // MobileNet has 53 layers
      for (let i = 0; i < 10000; i++) {
        result += Math.sqrt(i) * Math.sin(i) * Math.cos(layer);
      }
    }

    // Simulated classification results
    const predictions = [
      { class: 'cat', probability: 0.87 },
      { class: 'dog', probability: 0.09 },
      { class: 'bird', probability: 0.04 }
    ];

    const inferenceTime = Date.now() - startTime;

    return {
      predictions,
      inferenceTime,
      modelName: this.modelName
    };
  }
}

// Configuration
const USE_CLUSTER = process.env.CLUSTER === 'true';
const PORT = 3003;
const numCPUs = os.cpus().length;

if (USE_CLUSTER && cluster.isMaster) {
  // Cluster mode: Master process
  console.log(`[ML Master] Running in CLUSTER mode (${numCPUs} workers)`);
  console.log(`[ML Master] PID: ${process.pid}`);

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork();
    console.log(`[ML Master] Worker ${i + 1} spawned (PID: ${worker.process.pid})`);
  }

  // Handle crashes
  cluster.on('exit', (worker, code, signal) => {
    console.log(`[ML Master] Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });

} else {
  // Single process or cluster worker
  const model = new MLModel();

  const server = http.createServer(async (req, res) => {
    const startTime = Date.now();

    if (req.url === '/api/predict') {
      // ML inference endpoint
      try {
        // Simulated image data
        const imageData = { width: 224, height: 224, channels: 3 };
        
        const result = await model.predict(imageData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ...result,
          totalResponseTime: Date.now() - startTime,
          serverMode: USE_CLUSTER ? 'cluster' : 'single',
          workerPID: process.pid,
          cpuCores: numCPUs
        }));

      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: error.message,
          workerPID: process.pid
        }));
      }

    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        modelLoaded: model.loaded,
        serverMode: USE_CLUSTER ? 'cluster' : 'single',
        workerPID: process.pid
      }));

    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'ML Inference Server',
        model: model.modelName,
        serverMode: USE_CLUSTER ? `cluster (${numCPUs} workers)` : 'single process',
        endpoints: ['/api/predict', '/health'],
        workerPID: process.pid,
        warning: 'ML inference is CPU-intensive - cluster mode recommended'
      }));
    }
  });

  // Load model before starting server
  model.load().then(() => {
    server.listen(PORT, () => {
      if (USE_CLUSTER) {
        console.log(`[ML Worker ${process.pid}] Listening on port ${PORT}`);
      } else {
        console.log(`[ML Server] Running in SINGLE PROCESS mode`);
        console.log(`[ML Server] PID: ${process.pid}`);
        console.log(`[ML Server] Port: ${PORT}`);
        console.log(`[ML Server] Model: ${model.modelName}`);
        console.log(`[ML Server] ⚠️  WARNING: Single-threaded - will block on concurrent ML requests`);
        console.log(`[ML Server] 💡 TIP: Run with CLUSTER=true for better performance`);
      }
    });
  });
}

// Instructions
if (!USE_CLUSTER && !cluster.isMaster) {
  console.log(`\n📝 Usage:`);
  console.log(`  Single process: node ml-server.js`);
  console.log(`  Cluster mode:   CLUSTER=true node ml-server.js`);
  console.log(`  Load test:      node load-test-ml.js\n`);
}
