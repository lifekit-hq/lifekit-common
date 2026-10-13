#!/usr/bin/env node
// Fails when a built .d.ts references a path that leaves its own package (e.g. an inferred type
// emitted as import("../../../dist/...")). Such a path only resolves on the build machine, so every
// consumer gets TS2307 unless it sets skipLibCheck. Usage: node scripts/check-dts-portable.mjs [dir]
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative, resolve, sep} from 'node:path';

const distRoot = resolve(process.argv[2] ?? 'dist/lifekit-hq');
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"])([^'"]+)\1/g;

const walk = dir =>
  readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full);
    return entry.name.endsWith('.d.ts') ? [full] : [];
  });

const packageOf = file => join(distRoot, relative(distRoot, file).split(sep)[0]);

const findings = [];
for (const file of walk(distRoot)) {
  const pkg = packageOf(file);
  const text = readFileSync(file, 'utf8');
  for (const [, , specifier] of text.matchAll(SPECIFIER)) {
    if (!specifier.startsWith('.')) continue;
    const target = resolve(file, '..', specifier);
    if (target !== pkg && !target.startsWith(pkg + sep)) {
      findings.push(`${relative(process.cwd(), file)}: ${specifier}`);
    }
  }
}

if (findings.length > 0) {
  console.error('check-dts-portable: built declarations reach outside their package:');
  for (const f of findings) console.error(`  ${f}`);
  console.error('Give the inferred member an explicit type imported from the package entry point.');
  process.exit(1);
}
console.log('check-dts-portable: OK (no declaration reaches outside its package)');
