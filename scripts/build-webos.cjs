const { execFileSync } = require("node:child_process");
const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const outDir = join(root, "dist-webos");
const ipkDir = join(root, "dist-ipk");

// Clean previous builds
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

if (existsSync(ipkDir)) {
  rmSync(ipkDir, { recursive: true, force: true });
}

// Build the Vite application using the webOS mode. Invoke the local JS entry
// directly so Windows does not need to resolve npx.cmd through a shell.
const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
if (!existsSync(viteCli)) {
  throw new Error("Vite is missing. Run npm install in this project, then npm run webos:package again.");
}
execFileSync(process.execPath, [viteCli, "build", "--config", "vite.mobile.config.js", "--mode", "webos"], {
  stdio: "inherit",
  cwd: root,
});

// Read package version
const packageJsonPath = join(root, "package.json");
const packageJson = JSON.parse(
  readFileSync(packageJsonPath, "utf8")
);

const version = packageJson.version;

if (!version) {
  throw new Error("package.json does not contain a version.");
}

// Read webOS metadata
const appInfoPath = join(root, "webos", "appinfo.json");
const appInfo = JSON.parse(
  readFileSync(appInfoPath, "utf8")
);

// Always synchronize webOS version with package.json
appInfo.version = version;

// Validate Vite output
const indexPath = join(outDir, "index.html");

if (!existsSync(indexPath)) {
  throw new Error(
    "webOS build failed: dist-webos/index.html was not created."
  );
}

// Validate logo
const logoPath = join(root, "public", "logo.png");

if (!existsSync(logoPath)) {
  throw new Error(
    "webOS build failed: public/logo.png is missing."
  );
}

// Write synchronized appinfo.json
writeFileSync(
  join(outDir, "appinfo.json"),
  `${JSON.stringify(appInfo, null, 2)}\n`,
  "utf8"
);

// Copy application icon
copyFileSync(
  logoPath,
  join(outDir, "logo.png")
);

// Create IPK output directory
mkdirSync(ipkDir, { recursive: true });

// Call the pinned webOS packager's JS entry directly on every platform.
const packager = join(root, "node_modules", "@webos-tools", "cli", "bin", "ares-package.js");

if (!existsSync(packager)) {
  throw new Error(
    "webOS CLI is missing. Run npm install in this project, then npm run webos:package again."
  );
}

console.log("");
console.log("========================================");
console.log(" AnimeVault LG webOS Packaging");
console.log("========================================");
console.log(`Version: ${version}`);
console.log(`Input:   ${outDir}`);
console.log(`Output:  ${ipkDir}`);
console.log(`CLI:     ${packager}`);
console.log("========================================");
console.log("");

// Package the application
execFileSync(process.execPath, [packager, "--no-minify", "-o", ipkDir, outDir], {
  stdio: "inherit",
  cwd: root,
});

// Find generated IPK
const ipkFiles = readdirSync(ipkDir).filter(
  (file) => file.toLowerCase().endsWith(".ipk")
);

if (ipkFiles.length === 0) {
  throw new Error(
    "ares-package completed but no .ipk file was produced."
  );
}

console.log("");
console.log("========================================");
console.log(" webOS package created successfully");
console.log("========================================");

for (const file of ipkFiles) {
  console.log(join(ipkDir, file));
}

console.log("========================================");
console.log("");
