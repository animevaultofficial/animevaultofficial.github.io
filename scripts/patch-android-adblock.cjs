#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const mainActivity = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'animevault',
  'app',
  'MainActivity.java',
);

if (!fs.existsSync(mainActivity)) {
  throw new Error(`Capacitor Android MainActivity not found: ${mainActivity}`);
}

const source = `package com.animevault.app;

import android.os.Bundle;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayInputStream;
import java.util.Locale;
import java.util.HashSet;
import java.util.Set;

/**
 * AnimeVault native network filter.
 *
 * This is implemented at the Android WebView request layer rather than by
 * injecting JavaScript or using an iframe. Known advertising and tracking
 * hosts are cancelled before WebView loads them. Media requests are allowed.
 */
public class MainActivity extends BridgeActivity {
    private static final Set<String> BLOCKED_HOSTS = new HashSet<>();

    static {
        String[] hosts = new String[] {
            "doubleclick.net",
            "googlesyndication.com",
            "googleadservices.com",
            "adservice.google.com",
            "pagead.googlesyndication.com",
            "adnxs.com",
            "adsrvr.org",
            "adform.net",
            "criteo.com",
            "criteo.net",
            "outbrain.com",
            "taboola.com",
            "mgid.com",
            "zedo.com",
            "rubiconproject.com",
            "pubmatic.com",
            "openx.net",
            "adsafeprotected.com",
            "scorecardresearch.com",
            "quantserve.com",
            "hotjar.com",
            "mixpanel.com",
            "segment.io",
            "segment.com",
            "amplitude.com",
            "clarity.ms",
            "matomo.org",
            "matomo.cloud",
            "googletagmanager.com",
            "google-analytics.com",
            "analytics.google.com",
            "connect.facebook.net",
            "facebook.net",
            "ads-twitter.com",
            "analytics.twitter.com",
            "bat.bing.com",
            "ads.linkedin.com",
            "snap.licdn.com",
            "branch.io",
            "appsflyer.com",
            "adjust.com",
            "kochava.com",
            "unity3d.com",
            "unityads.unity3d.com",
            "applovin.com",
            "vungle.com",
            "ironsource.com",
            "startapp.com",
            "inmobi.com",
            "adcolony.com",
            "chartboost.com",
            "amazon-adsystem.com",
            "advertising.com"
        };
        for (String host : hosts) {
            BLOCKED_HOSTS.add(host);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView == null) {
            return;
        }

        WebViewClient existingClient = webView.getWebViewClient();
        webView.setWebViewClient(new AdBlockWebViewClient(existingClient));
    }

    private static boolean isAllowedMedia(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.contains(".m3u8")
            || lower.contains(".mp4")
            || lower.contains(".m4s")
            || lower.contains(".ts")
            || lower.contains(".vtt")
            || lower.contains(".webvtt");
    }

    private static boolean isBlockedHost(Uri uri) {
        String host = uri.getHost();
        if (host == null || host.isEmpty()) {
            return false;
        }
        host = host.toLowerCase(Locale.ROOT);

        for (String blocked : BLOCKED_HOSTS) {
            if (host.equals(blocked) || host.endsWith("." + blocked)) {
                return true;
            }
        }
        return false;
    }

    private static WebResourceResponse emptyBlockedResponse() {
        return new WebResourceResponse(
            "text/plain",
            "UTF-8",
            204,
            "No Content",
            null,
            new ByteArrayInputStream(new byte[0])
        );
    }

    private static final class AdBlockWebViewClient extends WebViewClient {
        private final WebViewClient delegate;

        AdBlockWebViewClient(WebViewClient delegate) {
            this.delegate = delegate;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String url = uri != null ? uri.toString() : "";

            if (isAllowedMedia(url)) {
                return delegate != null
                    ? delegate.shouldInterceptRequest(view, request)
                    : null;
            }

            if (uri != null && isBlockedHost(uri)) {
                return emptyBlockedResponse();
            }

            return delegate != null
                ? delegate.shouldInterceptRequest(view, request)
                : null;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            return delegate != null && delegate.shouldOverrideUrlLoading(view, request);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            return delegate != null && delegate.shouldOverrideUrlLoading(view, url);
        }

        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            if (delegate != null) delegate.onPageStarted(view, url, favicon);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (delegate != null) delegate.onPageFinished(view, url);
        }

        @Override
        public void onReceivedError(WebView view, android.webkit.WebResourceRequest request, android.webkit.WebResourceError error) {
            if (delegate != null) delegate.onReceivedError(view, request, error);
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            if (delegate != null) delegate.onReceivedError(view, errorCode, description, failingUrl);
        }
    }
}
`;

fs.writeFileSync(mainActivity, source, 'utf8');
console.log(`Patched native AnimeVault ad blocker: ${mainActivity}`);
