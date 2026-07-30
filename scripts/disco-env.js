import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';

const [command, ...args] = process.argv.slice(2);
const supportedCommands = new Set(['env:set', 'projects:add']);

if (!supportedCommands.has(command)) {
  console.error('Usage: pnpm disco:env -- <projects:add|env:set> [Disco command options]');
  process.exit(1);
}

let variables;

try {
  variables = parse(readFileSync('.env'));
} catch (error) {
  console.error(`Unable to read .env: ${error.message}`);
  process.exit(1);
}

const entries = Object.entries(variables)
  .filter(([, value]) => value !== '')
  .map(([key, value]) => `${key}=${value}`);

if (!entries.length) {
  console.error('No environment variables were found in .env.');
  process.exit(1);
}

const result = spawnSync('disco', [command, ...args, ...entries], {
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Unable to run Disco: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
