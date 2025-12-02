import vm from 'vm';
import fs from 'fs';
import path from 'path';

// Create a mock DOM environment
const mockDOM = {
  document: {
    createElement: (tag) => ({ tagName: tag, className: '', appendChild() {}, addEventListener() {}, innerHTML: '', style: {} }),
    getElementById: (id) => ({ id, appendChild() {}, addEventListener() {}, innerHTML: '' }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  },
  window: {
    document: {},
    getComputedStyle: () => ({}),
    CustomEvent: class {},
  }
};

async function testFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const ctx = vm.createContext({
      ...mockDOM,
      console,
      Math,
      Object,
      Array,
      String,
      Number,
      Boolean,
      Map,
      Set,
      JSON,
      Promise,
      fetch: () => Promise.resolve(),
      import: (path) => Promise.resolve({}),
    });
    
    vm.runInContext(content, ctx);
    return { success: true, file: filepath };
  } catch (e) {
    return { success: false, file: filepath, error: e.message };
  }
}

const files = [
  'js/exportTools.js',
  'js/randomizers.js',
  'js/layoutShell.js'
];

for (const file of files) {
  const result = await testFile(file);
  if (result.success) {
    console.log(`✓ ${result.file} - OK`);
  } else {
    console.log(`✗ ${result.file} - ${result.error}`);
  }
}
