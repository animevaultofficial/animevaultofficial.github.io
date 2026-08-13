# AnimeVault Android release signing

AnimeVault's Android GitHub Actions job builds a fresh Capacitor Android project on every run and signs the release APK/AAB with a release keystore stored only in GitHub Secrets.

## Generate the release keystore once

Run this locally on a trusted machine. Do not run it in CI, and do not create a different keystore for every release.

```bash
keytool -genkeypair \
  -v \
  -keystore animevault-release.keystore \
  -alias animevault \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000
```

When prompted, choose strong private passwords and keep them somewhere safe. Do not write actual passwords into this repository.

## Convert the keystore to Base64

On Windows PowerShell, run this from the directory containing `animevault-release.keystore`:

```powershell
[Convert]::ToBase64String(
  [IO.File]::ReadAllBytes(".\animevault-release.keystore")
) | Set-Clipboard
```

The Base64 value is copied to your clipboard for the GitHub secret below.

## Create the required GitHub repository secrets

In GitHub, open the repository settings and create these four Actions secrets:

| Secret name | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | The Base64 text produced from `animevault-release.keystore`. |
| `ANDROID_KEYSTORE_PASSWORD` | The keystore password you entered during `keytool -genkeypair`. |
| `ANDROID_KEY_ALIAS` | The alias used for the key, for example `animevault`. |
| `ANDROID_KEY_PASSWORD` | The key password you entered during `keytool -genkeypair`. |

## Security rules

- Never commit `animevault-release.keystore`, `*.keystore`, or `*.jks` files to Git.
- Never upload the keystore as a GitHub Actions artifact.
- Never paste the keystore, Base64 keystore, keystore password, or key password into workflow logs, issues, pull requests, or source files.
- Keep a secure backup of the keystore and passwords. Losing them can prevent you from publishing updates signed with the same Android identity.
