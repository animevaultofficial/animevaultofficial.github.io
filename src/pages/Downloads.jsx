import React, { useEffect, useState } from 'react';
import { Download, Apple, Windows, Linux, Smartphone } from 'lucide-react';

const DownloadPage = () => {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const response = await fetch(
          'https://api.github.com/repos/adiyanhehe/Anime-Vault/releases'
        );
        if (!response.ok) throw new Error('Failed to fetch releases');
        
        const data = await response.json();
        // Filter out drafts and sort by latest
        const publishedReleases = data
          .filter(release => !release.draft)
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        
        setReleases(publishedReleases);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, []);

  const getPlatformIcon = (filename) => {
    if (filename.includes('Windows') || filename.endsWith('.exe')) return <Windows className="w-5 h-5" />;
    if (filename.includes('macOS') || filename.endsWith('.dmg')) return <Apple className="w-5 h-5" />;
    if (filename.includes('Linux') || filename.endsWith('.AppImage')) return <Linux className="w-5 h-5" />;
    if (filename.includes('Android') || filename.endsWith('.apk')) return <Smartphone className="w-5 h-5" />;
    return <Download className="w-5 h-5" />;
  };

  const getPlatformLabel = (filename) => {
    if (filename.includes('Windows') || filename.endsWith('.exe')) return 'Windows';
    if (filename.includes('macOS') || filename.endsWith('.dmg')) return 'macOS';
    if (filename.includes('Linux') || filename.endsWith('.AppImage')) return 'Linux';
    if (filename.includes('Android') || filename.endsWith('.apk')) return 'Android';
    return 'Download';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <Download className="w-12 h-12 text-blue-500" />
          </div>
          <p className="text-gray-300">Loading releases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">AnimeVault Downloads</h1>
          <p className="text-gray-400">Get the latest releases for your platform</p>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-8 text-red-200">
            Error loading releases: {error}
          </div>
        )}

        {releases.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-gray-400">No releases available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {releases.map((release) => (
              <div
                key={release.id}
                className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all duration-300"
              >
                {/* Release Header */}
                <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{release.tag_name}</h2>
                      <p className="text-sm text-gray-400">
                        Released {new Date(release.published_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-300 text-sm">
                      Latest
                    </span>
                  </div>
                </div>

                {/* Release Description */}
                {release.body && (
                  <div className="px-6 py-3 bg-slate-800/30">
                    <p className="text-gray-300 text-sm">{release.body}</p>
                  </div>
                )}

                {/* Assets Grid */}
                <div className="px-6 py-6">
                  {release.assets.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">No assets available</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {release.assets.map((asset) => {
                        // Skip blockmap and yml files in the grid
                        if (asset.name.endsWith('.blockmap') || asset.name.endsWith('.yml')) {
                          return null;
                        }

                        return (
                          <a
                            key={asset.id}
                            href={asset.browser_download_url}
                            download
                            className="group bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 flex items-center space-x-3"
                          >
                            <div className="text-blue-400 group-hover:text-blue-300">
                              {getPlatformIcon(asset.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white group-hover:text-blue-300 truncate">
                                {getPlatformLabel(asset.name)}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {(asset.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            </div>
                            <Download className="w-4 h-4 text-gray-400 group-hover:text-blue-300 flex-shrink-0" />
                            {window && window.electronDownload && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  try {
                                    window.electronDownload.start(asset.browser_download_url, asset.name).then(res => {
                                      if (res?.success) alert('Download started: ' + res.path);
                                      else alert('Failed to start download: ' + (res?.error || 'unknown'));
                                    });
                                  } catch (err) {
                                    alert('Download not available in this environment');
                                  }
                                }}
                                className="ml-2 px-2 py-1 rounded bg-blue-600 text-white text-xs"
                              >
                                Stream Download
                              </button>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-slate-700">
          <p className="text-gray-400 text-sm">
            All releases are automatically built and published from source
          </p>
          <a
            href="https://github.com/adiyanhehe/Anime-Vault/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
          >
            View on GitHub →
          </a>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
