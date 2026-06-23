package com.animevault.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installMobileAdBlocker();
    }

    private void installMobileAdBlocker() {
        if (bridge == null) return;
        bridge.setWebViewClient(new AnimeVaultWebViewClient(bridge));
    }

    /**
     * Native Android equivalent of the desktop Electron session blocker.
     *
     * Capacitor's JavaScript layer cannot see requests made by third-party player iframes,
     * so this WebViewClient blocks ad/tracker hosts before Android WebView loads them.
     */
    private static final class AnimeVaultWebViewClient extends BridgeWebViewClient {
        private static final Set<String> BLOCKED_HOSTS = new HashSet<>(Arrays.asList(
            "www.google-analytics.com",
            "analytics.google.com",
            "googletagmanager.com",
            "www.googletagmanager.com",
            "googletagservices.com",
            "doubleclick.net",
            "adservice.google.com",
            "adservice.google.de",
            "pagead2.googlesyndication.com",
            "stats.g.doubleclick.net",
            "yt3.ggpht.com",
            "fonts.googleapis.com",
            "fonts.gstatic.com",
            "googleapis.com",
            "gstatic.com",
            "cdn.adx1.com",
            "intelligenceadx.com",
            "adsco.re",
            "mc.yandex.com",
            "mc.yandex.ru",
            "bvtpk.com",
            "my.rtmark.net",
            "b7510.com",
            "gt.unbrownunflat.com",
            "im.malocacomals.com",
            "users.videasy.net",
            "nf.sixmossin.com",
            "realizationnewestfangs.com",
            "acscdn.com",
            "lt.taloseempest.com",
            "pl26708123.profitableratecpm.com",
            "preferencenail.com",
            "protrafficinspector.com",
            "s10.histats.com",
            "weirdopt.com",
            "static.cloudflareinsights.com",
            "kettledroopingcontinuation.com",
            "wayfarerorthodox.com",
            "woxaglasuy.net",
            "adeptspiritual.com",
            "www.calculating-laugh.com",
            "amavhxdlofklxjg.xyz",
            "7jtjubf8p5kq7x3z2.u3qleufcm6vure326ktfpbj.cfd",
            "5mq.get64t9vqg8pnbex1y463o.rest",
            "usrpubtrk.com",
            "adexchangeclear.com",
            "rzjzjnavztycv.online",
            "tmstr4.cloudnestra.com",
            "tmstr4.neonhorizonworkshops.com"
        ));

        AnimeVaultWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (request != null && isBlockedHost(request.getUrl().getHost())) {
                return emptyBlockedResponse();
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (request != null && isBlockedHost(request.getUrl().getHost())) {
                return true;
            }
            return super.shouldOverrideUrlLoading(view, request);
        }

        @Deprecated
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            if (isBlockedUrl(url)) {
                return true;
            }
            return super.shouldOverrideUrlLoading(view, url);
        }

        private static boolean isBlockedUrl(String url) {
            try {
                return isBlockedHost(android.net.Uri.parse(url).getHost());
            } catch (Exception ignored) {
                return false;
            }
        }

        private static boolean isBlockedHost(String host) {
            if (host == null) return false;
            String normalized = host.toLowerCase(Locale.US);
            if (normalized.startsWith("www.")) {
                normalized = normalized.substring(4);
            }
            for (String blockedHost : BLOCKED_HOSTS) {
                String blocked = blockedHost.toLowerCase(Locale.US);
                if (blocked.startsWith("www.")) {
                    blocked = blocked.substring(4);
                }
                if (normalized.equals(blocked) || normalized.endsWith("." + blocked)) {
                    return true;
                }
            }
            return false;
        }

        private static WebResourceResponse emptyBlockedResponse() {
            return new WebResourceResponse(
                "text/plain",
                "utf-8",
                new ByteArrayInputStream(new byte[0])
            );
        }
    }
}
