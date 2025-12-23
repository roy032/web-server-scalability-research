# Web Server Scalability Research

##  Research Paper

**[Web_Server_Scalability_Research_Final.docx](docs/Web_Server_Scalability_Research_Final.docx)** (582 KB, 25-30 pages)

Comprehensive academic research on architectural optimizations for scalable web services in resource-constrained environments.

###  Key Findings

 **67% Latency Reduction** - CPU-bound: 145ms  48ms (Node.js Cluster)  
 **90% Memory Efficiency** - Apache: 500MB  NGINX: 50MB @ 1000 connections  
 **200x Cost Reduction** - $20/month VM = $50,000+ traditional setup  
 **1000 Concurrent Users** - Sub-100ms latency on 2-core/4GB RAM

##  Implementation

Server implementations included:
- Node.js single-threaded (`src/server-basic.js`)
- Node.js Cluster mode (`src/server-cluster.js`)
- Express with caching (`src/server-express.js`)
- NGINX reverse proxy (`config/nginx.conf`)

##  Quick Start

```bash
# Clone repository
git clone https://github.com/roy032/web-server-scalability-research.git
cd web-server-scalability-research

# Install dependencies
npm install

# Start servers
npm run start          # Basic (port 3000)
npm run start:cluster  # Cluster (port 3001)
npm run start:express  # Express (port 3002)
```

##  Benchmarks

| Architecture | Latency | Throughput | Memory |
|--------------|---------|------------|--------|
| NGINX | 52ms | 52K req/s | 50 MB |
| Node Cluster | 48ms | 45K req/s | 200 MB |
| Express | 35ms | 38K req/s | 75 MB |

##  License

MIT - see LICENSE file
