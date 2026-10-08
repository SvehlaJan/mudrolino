import { readFileSync } from 'node:fs';
import validator from 'gltf-validator';

const target = process.argv[2];

if (!target) {
  console.error('Usage: npm run avatar:gltf:validate -- <asset.glb>');
  process.exit(1);
}

const report = await validator.validateBytes(new Uint8Array(readFileSync(target)), {
  uri: target,
  format: target.endsWith('.glb') ? 'glb' : undefined,
  maxIssues: 50,
});

const { numErrors, numWarnings, numInfos, numHints, messages } = report.issues;

console.log(
  JSON.stringify(
    {
      asset: target,
      errors: numErrors,
      warnings: numWarnings,
      infos: numInfos,
      hints: numHints,
      messages: messages.slice(0, 10).map((message) => ({
        severity: message.severity,
        code: message.code,
        message: message.message,
        pointer: message.pointer,
      })),
    },
    null,
    2,
  ),
);

if (numErrors > 0) {
  process.exit(1);
}
