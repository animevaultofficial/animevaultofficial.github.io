import { APP_VERSION } from '../../version.js';

export const GITHUB_REPO = 'animevaultofficial/animevaultofficial.github.io';
export const UPDATE_CHECK_KEY = 'av_last_update_check';

export function compareVersions(a = '0.0.0', b = '0.0.0') {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function findApkAsset(assets = []) {
  return assets.find(asset => /\.apk$/i.test(asset.name || '')) || null;
}

export async function checkMobileUpdate() {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not check for updates.');
  const data = await res.json();
  const latestVersion = data.tag_name?.replace(/^v/, '') || data.name?.replace(/^v/, '') || APP_VERSION;
  const apkAsset = findApkAsset(data.assets || []);
  localStorage.setItem(UPDATE_CHECK_KEY, String(Date.now()));
  return {
    currentVersion: APP_VERSION,
    latestVersion,
    isOutdated: compareVersions(APP_VERSION, latestVersion) < 0,
    releaseUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases`,
    releaseNotes: data.body?.slice(0, 1500) || 'No release notes available.',
    publishedAt: data.published_at ? new Date(data.published_at).toLocaleDateString() : 'Unknown',
    apkName: apkAsset?.name || '',
    apkUrl: apkAsset?.browser_download_url || '',
  };
}

export async function downloadApkInBackground(updateInfo, onProgress) {
  if (!updateInfo?.apkUrl) return { ...updateInfo, downloadUrl: updateInfo?.releaseUrl, downloaded: false };
  const res = await fetch(updateInfo.apkUrl);
  if (!res.ok) throw new Error('APK download failed.');
  const total = Number(res.headers.get('content-length') || 0);
  if (!res.body) {
    const blob = await res.blob();
    return { ...updateInfo, downloadUrl: URL.createObjectURL(blob), downloaded: true };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total && onProgress) onProgress(Math.round((received / total) * 100));
  }
  const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
  return { ...updateInfo, downloadUrl: URL.createObjectURL(blob), downloaded: true };
}
