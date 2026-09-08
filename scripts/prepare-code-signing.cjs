const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

if (process.platform !== 'win32') {
  process.exit(0);
}

const pfxPath = path.join(process.cwd(), 'animevault-code-signing.pfx');
if (fs.existsSync(pfxPath)) {
  process.exit(0);
}

const password = process.env.CSC_KEY_PASSWORD || process.env.WIN_CSC_KEY_PASSWORD;
const base64 = process.env.WINDOWS_CODE_SIGNING_PFX_BASE64;

if (base64) {
  fs.writeFileSync(pfxPath, Buffer.from(base64.trim(), 'base64'));
  console.log('Using WINDOWS_CODE_SIGNING_PFX_BASE64 for Windows code signing.');
  process.exit(0);
}

if (!password) {
  throw new Error('CSC_KEY_PASSWORD is required to generate the temporary Windows code-signing certificate.');
}

const ps = `
$ErrorActionPreference = 'Stop'
$pfx = '${pfxPath.replace(/'/g, "''")}'
$password = '${password.replace(/'/g, "''")}'
$secure = ConvertTo-SecureString $password -AsPlainText -Force
$cert = New-SelfSignedCertificate -Subject 'CN=AnimeVault' -KeyExportPolicy Exportable -KeyLength 2048 -CertStoreLocation 'Cert:\\CurrentUser\\My' -KeyUsage DigitalSignature -Type CodeSigningCert
Export-PfxCertificate -Cert "Cert:\\CurrentUser\\My\\$($cert.Thumbprint)" -FilePath $pfx -Password $secure -ChainOption BuildChain | Out-Null
Remove-Item "Cert:\\CurrentUser\\My\\$($cert.Thumbprint)" -Force -ErrorAction SilentlyContinue
if (-not (Test-Path $pfx)) { throw 'Failed to create AnimeVault code-signing PFX.' }
Write-Host 'Generated temporary AnimeVault Windows code-signing certificate.'
`;

execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps], { stdio: 'inherit' });
