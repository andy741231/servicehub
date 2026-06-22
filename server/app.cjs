// CJS entry-point shim for iisnode (which doesn't support ES modules directly)
// Dynamically imports the ES module server
import('./src/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
