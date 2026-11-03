import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const nodeRequire = createRequire(import.meta.url);
const { collectReferencedEnv, parseExampleKeys, missingEnvKeys, checkEnvExamples } = nodeRequire(
  '../../scripts/check-env-example.js',
);

const temporaryDirectories = [];

const makeDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aurora-env-check-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    fs.rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe('parseExampleKeys', () => {
  it('reads declared keys and ignores comments, blanks and lower-case names', () => {
    const contents = [
      '# Server',
      'PORT=4000',
      '  DATABASE_URL="mysql://root@localhost/db"',
      '',
      '# not_a_key=value',
      'lowercase=value',
    ].join('\n');

    expect(parseExampleKeys(contents)).toEqual(['DATABASE_URL', 'PORT']);
  });

  it('returns no keys for an empty file', () => {
    expect(parseExampleKeys('')).toEqual([]);
  });
});

describe('missingEnvKeys', () => {
  it('reports referenced variables that are not documented', () => {
    expect(
      missingEnvKeys({
        referenced: ['AUTH_RATE_LIMIT', 'DATABASE_URL', 'PORT'],
        documented: ['PORT'],
      }),
    ).toEqual(['AUTH_RATE_LIMIT', 'DATABASE_URL']);
  });

  it('reports nothing when every referenced variable is documented', () => {
    expect(missingEnvKeys({ referenced: ['PORT'], documented: ['PORT', 'UNUSED'] })).toEqual([]);
  });
});

describe('collectReferencedEnv', () => {
  it('walks nested directories, de-duplicates names and respects extensions', () => {
    const root = makeDirectory();
    fs.mkdirSync(path.join(root, 'nested'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'index.js'),
      'process.env.NODE_ENV;\nprocess.env.PORT;\nprocess.env.NODE_ENV;\n',
    );
    fs.writeFileSync(path.join(root, 'nested', 'config.js'), 'process.env.DATABASE_URL;');
    fs.writeFileSync(path.join(root, 'ignored.ts'), 'process.env.SHOULD_NOT_APPEAR;');

    expect(collectReferencedEnv([root], ['.js'])).toEqual(['DATABASE_URL', 'NODE_ENV', 'PORT']);
  });

  it('ignores directories that do not exist', () => {
    expect(collectReferencedEnv([path.join(makeDirectory(), 'missing')], ['.js'])).toEqual([]);
  });
});

describe('checkEnvExamples', () => {
  it('confirms every variable used by this repository is documented', () => {
    const results = checkEnvExamples();

    expect(results.map((result) => result.name)).toEqual(['server', 'client']);
    for (const result of results) {
      expect(result.exampleExists).toBe(true);
      expect(result.missing).toEqual([]);
      expect(result.referenced.length).toBeGreaterThan(0);
    }
  });

  it('flags a workspace whose example file is missing', () => {
    const root = makeDirectory();
    fs.mkdirSync(path.join(root, 'server', 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'server', 'src', 'config.js'), 'process.env.PORT;');
    fs.mkdirSync(path.join(root, 'client', 'lib'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'client', 'lib', 'api.ts'),
      'process.env.NEXT_PUBLIC_API_URL;',
    );
    fs.writeFileSync(path.join(root, 'client', '.env.example'), 'NEXT_PUBLIC_API_URL=\n');

    const server = checkEnvExamples({ root }).find((result) => result.name === 'server');
    const client = checkEnvExamples({ root }).find((result) => result.name === 'client');

    expect(server.exampleExists).toBe(false);
    expect(server.missing).toEqual(['PORT']);
    expect(client.missing).toEqual([]);
  });
});
