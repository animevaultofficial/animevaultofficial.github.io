const { execSync } = require('child_process');

function run(command) {
  console.log('> ' + command);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (err) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

// Bump version
run('npm run bump-version');
// Commit and push version bump. npm version also updates package-lock.json;
// keep the shared runtime version file in sync so mobile update checks never lag.
const pkg = require('../package.json');
require('fs').writeFileSync(require('path').join(__dirname, '..', 'src', 'version.js'), `export const APP_VERSION = '${pkg.version}';\n`);
run('git add package.json package-lock.json src/version.js');
run(`git commit -m "chore: bump version to v${pkg.version}"`);
run('git push');

// Build targets sequentially
const builds = [
  'npm run android:build',
  'npm run electron:build -- --linux',
  'npm run electron:build -- --win',
  'npm run electron:build -- --mac',
];
for (const cmd of builds) {
  run(cmd);
}

console.log('All builds completed successfully.');
