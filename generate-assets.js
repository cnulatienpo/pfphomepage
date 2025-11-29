import { run } from './assetScanner.js';

run().catch((error) => {
  console.error('Asset generation failed:', error);
  process.exitCode = 1;
});
