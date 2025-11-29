import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testsDir = path.join(__dirname, 'tests');

const colors = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  bold: '\u001b[1m',
};

const symbols = {
  pass: `${colors.green}\u2713${colors.reset}`,
  fail: `${colors.red}\u2717${colors.reset}`,
};

function line(char = '-', width = 41) {
  return char.repeat(width);
}

function formatDuration(ms) {
  return `${ms}ms`;
}

async function discoverTests() {
  try {
    const entries = await fs.readdir(testsDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
      .map((entry) => entry.name)
      .sort();
    return files;
  } catch (err) {
    throw new Error(`Unable to read tests directory at ${testsDir}: ${err.message}`);
  }
}

function runNodeTest(filePath) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(process.execPath, ['--test', filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code, signal) => {
      const duration = Date.now() - start;
      resolve({
        code,
        signal,
        duration,
        output: output.trim(),
      });
    });
  });
}

function printHeader() {
  console.log(line());
  console.log('FISHER-PRICE THEME BUILDER — TEST REPORT');
  console.log(line());
  console.log();
}

function printFooter(allPassed) {
  console.log();
  if (allPassed) {
    console.log('ALL TESTS PASSED \ud83c\udf89');
  } else {
    console.log('\u274c SOME TESTS FAILED');
  }
  console.log(line());
}

function padName(name, width) {
  return name.padEnd(width, ' ');
}

async function main() {
  printHeader();
  let testFiles;
  try {
    testFiles = await discoverTests();
  } catch (err) {
    console.error(`${colors.red}✗${colors.reset} ${err.message}`);
    printFooter(false);
    process.exitCode = 1;
    return;
  }

  if (testFiles.length === 0) {
    console.log(`${colors.yellow}No test files found in /tests.${colors.reset}`);
    printFooter(false);
    process.exitCode = 1;
    return;
  }

  const longestName = Math.max(...testFiles.map((name) => name.length), 16);
  const results = [];

  for (const file of testFiles) {
    const filePath = path.join(testsDir, file);
    const result = await runNodeTest(filePath);
    const passed = result.code === 0;
    results.push({ file, passed, ...result });
    const status = passed ? symbols.pass : symbols.fail;
    const label = padName(file, longestName + 2);
    if (passed) {
      console.log(`${status} ${label}PASS (${formatDuration(result.duration)})`);
    } else {
      console.log(`${status} ${label}${colors.red}FAIL${colors.reset}`);
      if (result.output) {
        const indented = result.output
          .split('\n')
          .map((line) => `    ${line}`)
          .join('\n');
        console.log(indented);
      }
    }
  }

  const allPassed = results.every((r) => r.passed);
  printFooter(allPassed);
  process.exitCode = allPassed ? 0 : 1;
}

main().catch((err) => {
  console.error(`${colors.red}Unexpected error:${colors.reset} ${err.message}`);
  process.exitCode = 1;
});
