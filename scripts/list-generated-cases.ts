import { apiGeneratedCases } from '../tests/generated/api.generated.js';
import { dashboardGeneratedCases } from '../tests/generated/dashboard.generated.js';
import { loginGeneratedCases } from '../tests/generated/login.generated.js';

const modules = [
  ['Login', loginGeneratedCases],
  ['Dashboard', dashboardGeneratedCases],
  ['REST API', apiGeneratedCases],
] as const;

let total = 0;

for (const [moduleName, cases] of modules) {
  console.log(`\n${moduleName} (${cases.length})`);
  for (const generatedCase of cases) {
    total += 1;
    console.log(`- [${generatedCase.type}] ${generatedCase.id}: ${generatedCase.title}`);
  }
}

console.log(`\nTotal generated cases: ${total}`);
console.log('\nExecutable module specs:');
console.log('- tests/login/generated-login.spec.ts');
console.log('- tests/dashboard/generated-dashboard.spec.ts');
console.log('- tests/api/generated-api.spec.ts');
console.log('\nRun all 21 executable generated cases with: npm run test:generated:run');
