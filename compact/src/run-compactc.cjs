#!/usr/bin/env node

const childProcess = require('child_process');
const path = require('path');

const [_node, _script, ...args] = process.argv;
const COMPACT_HOME_ENV = process.env.COMPACT_HOME;

let compactPath;
if (COMPACT_HOME_ENV != null) {
  compactPath = COMPACT_HOME_ENV;
  console.log(`'COMPACT_HOME' env variable is set; using Compact from ${compactPath}`);
} else {
  throw new Error(`'COMPACT_HOME' environment variable is not set`);
}

// yarn runs everything with node...
const child = childProcess.spawn(path.resolve(compactPath, 'compactc'), args, {
  stdio: 'inherit'
});
child.on('exit', (code, signal) => {
  if (code === 0) {
    process.exit(0);
  } else {
    process.exit(code ?? signal);
  }
})
