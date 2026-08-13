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
const { join } = require("node:path");

const root = process.cwd();
const outDir = join(root, "dist-webos");
const ipkDir = join(root, "dist-ipk");

// Clean previous builds
if (existsSync(outDir)) {
  rmSync(outDir, { recursive: true, force: true });
}

if (existsSync(ipkDir)) {
  rmSync(ipkDir, { recursive: true, force: true });
}

// Build the Vite application using the webOS mode
execFileSync("npx", ["vite", "build", "--mode", "webos"], {
  stdio: "inherit",
  shell: process.platform === "win32",
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

// Determine platform-specific executable
const packager =
  process.platform === "win32"
    ? "ares-package.cmd"
    : "ares-package";

console.log("");
console.log("========================================");
console.log(" AnimeVault LG webOS Packaging");
console.log("========================================");
console.log(`Version: ${version}`);
console.log(`Input:   ${outDir}`);
console.log(`Output:  ${ipkDir}`);
console.log("========================================");
console.log("");

// Package the application
execFileSync(
  packager,
  ["-o", ipkDir, outDir],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  }
);

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
