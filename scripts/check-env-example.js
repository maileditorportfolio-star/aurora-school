#!/usr/bin/env node
/**
 * Verifies every `process.env.X` referenced in the workspaces is documented
 * in its `.env.example` file. Run: `npm run check:env`
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.next', 'coverage', 'uploads', '.git']);

/** Walks roots and returns sorted unique env var names matching `extensions`. */
const collectReferencedEnv = (roots, extensions = ['.js', '.ts', '.tsx']) => {
  const found = new Set();

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!extensions.includes(path.extname(entry.name))) continue;
      const contents = fs.readFileSync(full, 'utf8');
      for (const match of contents.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
        found.add(match[1]);
      }
    }
  };

  roots.forEach(walk);
  return [...found].sort();
};

/** Parses an example env file into the sorted keys it documents. */
const parseExampleKeys = (contents) => {
  const keys = [];
  for (const rawLine of String(contents).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
    if (match) keys.push(match[1]);
  }
  return keys.sort();
};

const missingEnvKeys = ({ referenced, documented }) => {
  const known = new Set(documented);
  return referenced.filter((name) => !known.has(name));
};

/** Mirrors the repository layout: each workspace gets its own example file. */
const checkEnvExamples = ({ root = ROOT } = {}) => {
  const workspaces = [
    {
      name: 'server',
      roots: [path.join(root, 'server', 'src'), path.join(root, 'server', 'prisma')],
      extensions: ['.js'],
      example: path.join(root, 'server', '.env.example'),
    },
    {
      name: 'client',
      roots: [
        path.join(root, 'client', 'app'),
        path.join(root, 'client', 'lib'),
        path.join(root, 'client', 'store'),
        path.join(root, 'client', 'components'),
      ],
      extensions: ['.ts', '.tsx', '.js', '.mjs'],
      example: path.join(root, 'client', '.env.example'),
    },
  ];

  return workspaces.map((workspace) => {
    const exampleExists = fs.existsSync(workspace.example);
    const referenced = collectReferencedEnv(workspace.roots, workspace.extensions);
    const documented = exampleExists
      ? parseExampleKeys(fs.readFileSync(workspace.example, 'utf8'))
      : [];
    const missing = missingEnvKeys({ referenced, documented });

    return { ...workspace, exampleExists, referenced, documented, missing };
  });
};

const main = () => {
  const results = checkEnvExamples();
  let failed = false;

  for (const result of results) {
    if (!result.exampleExists) {
      console.error(`✗ ${result.name}: missing ${path.relative(ROOT, result.example)}`);
      failed = true;
      continue;
    }
    if (result.missing.length > 0) {
      console.error(`✗ ${result.name}: referenced but undocumented: ${result.missing.join(', ')}`);
      failed = true;
      continue;
    }
    console.log(`✓ ${result.name}: ${result.referenced.length} referenced variable(s) documented`);
  }

  process.exit(failed ? 1 : 0);
};

if (require.main === module) main();

module.exports = { collectReferencedEnv, parseExampleKeys, missingEnvKeys, checkEnvExamples };
