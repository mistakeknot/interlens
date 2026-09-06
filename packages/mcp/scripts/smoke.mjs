#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, '..');
const [command, value = '{}'] = process.argv.slice(2);

if (!command) {
  throw new Error('usage: smoke.mjs <tool> [json-arguments] | --resource <uri>');
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(packageRoot, 'index.js')],
});
const client = new Client(
  { name: 'linsenkasten-smoke', version: '1.0.0' },
  { capabilities: {} },
);

try {
  await client.connect(transport);
  if (command === '--resource') {
    const result = await client.readResource({ uri: value });
    process.stdout.write(`${result.contents[0].text}\n`);
  } else {
    const args = JSON.parse(value);
    const result = await client.callTool({ name: command, arguments: args });
    const text = result.content.find(item => item.type === 'text')?.text || '';
    process.stdout.write(`${text}\n`);
  }
} finally {
  await client.close();
}
