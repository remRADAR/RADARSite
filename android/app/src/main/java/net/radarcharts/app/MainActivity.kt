/*
 * RADARSite Android shell — MainActivity
 *
 * One module, two flavours (ADR-004 / invariant I6). The flavour only changes manifest
 * metadata and a build flag; this file is shared byte-for-byte by `mobile` and `tv`.
 *
 * IMPORTANT ARCHITECTURAL NOTE
 * ---------------------------
 * This class EXTENDS BridgeActivity and must not replace the WebView's client: the
 * Capacitor bridge owns BridgeWebViewClient, and swapping it detaches the plugin
 * bridge entirely (core function would break). Every shell obligation below is
 * therefore implemented through Capacitor's supported extension points:
 *
 *   C3.1  WebView-version gate  -> android.minWebViewVersion in capacitor.config.json
 *                                  plus a friendly screen here if the gate trips
 *   A2.4  offline fallback      -> server.errorPath (Capacitor guards isForMainFrame
 *                                  itself, so a failed <img> cannot blank the app)
 *   C1.3  OAuth / external URLs -> Capacitor's launchIntent routes off-origin URLs to
 *                                  the system browser, which is what providers require
 *   C4.2  native D-pad fallback -> dispatchKeyEvent forwarding into the WebView
 *   I3    cache hygiene         -> WebView settings applied to bridge.getWebView()
 */
package net.radarcharts.app

import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.webkit.WebSettings
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "RadarShell"

        /** Mirrors android.minWebViewVersion in capacitor.config.json (single source: the config). */
        private const val FALLBACK_MIN_CHROMIUM_MAJOR = 87

        private val DPAD_KEYS = setOf(
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
        )
    }

    private var webView: WebView? = null
    private var unsupportedShown = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val wv = bridge?.webView
        webView = wv
        if (wv == null) {
            Log.e(TAG, "bridge/webView unavailable — shell cannot continue")
            return
        }

        applyShellSettings(wv)
        enforceWebViewGate(wv)
    }

    // ---------------------------------------------------------------- I3 / shell

    /**
     * I3: authenticated content never enters a shared cache. The WebView must not keep
     * a persistent HTTP cache or form data across sessions for an account-bearing app.
     */
    @Suppress("DEPRECATION")
    private fun applyShellSettings(wv: WebView) {
        wv.settings.apply {
            // No disk-backed HTTP cache for authenticated HTML.
            cacheMode = WebSettings.LOAD_NO_CACHE
            // No autofill of previously typed credentials.
            saveFormData = false
            // Never upgrade-or-downgrade silently to mixed content.
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            }
            // TV remotes have no touch; media should not autoplay with sound.
            mediaPlaybackRequiresUserGesture = true
        }
        wv.clearCache(true)
        Log.i(TAG, "shell settings applied (no-cache, no form data, no mixed content)")
    }

    // ------------------------------------------------------------------ C3.1

    /**
     * ADR-003: an API floor is not a runtime floor. minSdk 24 admits devices whose
     * System WebView can be a 2016 Chromium that cannot parse the bundle — the app
     * installs, launches, and shows a white screen.
     *
     * Capacitor's `android.minWebViewVersion` already gates the bridge and redirects to
     * `server.errorPath`. This adds the explicit, friendly version screen for the case
     * where the gate trips and no errorPath is configured.
     */
    private fun enforceWebViewGate(wv: WebView) {
        val major = systemWebViewMajor() ?: return
        val floor = configuredMinWebViewVersion() ?: FALLBACK_MIN_CHROMIUM_MAJOR
        Log.i(TAG, "System WebView major=$major floor=$floor")
        if (major >= floor) return

        unsupportedShown = true
        val html = """
            <!doctype html><html><head><meta name="viewport" content="width=device-width">
            <style>
              html,body{margin:0;height:100%;background:#07090f;color:#eef2ff;
                font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
                display:grid;place-items:center;padding:24px;text-align:center}
              .m{width:52px;height:52px;border-radius:14px;margin:0 auto 20px;
                background:linear-gradient(135deg,#4ade80,#22d3ee);display:grid;
                place-items:center;color:#04120a;font-weight:900;font-size:24px}
              h1{font-size:21px;margin:0 0 12px}
              p{color:#8b97b4;line-height:1.6;max-width:400px;margin:0 auto 22px;font-size:14px}
              a{display:inline-block;padding:12px 24px;border-radius:11px;background:#4ade80;
                color:#04120a;font-weight:700;text-decoration:none;font-size:14px}
            </style></head><body><div>
              <div class="m">R</div>
              <h1>Update Android System WebView</h1>
              <p>RADARCharts needs a newer Android System WebView to render charts on this
                 device. Your current version is $major; version $floor or newer is required.</p>
              <a href="https://play.google.com/store/apps/details?id=com.google.android.webview">
                 Update WebView</a>
            </div></body></html>
        """.trimIndent()
        wv.loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
    }

    /** Reads the real System WebView major version, or null if it cannot be determined. */
    private fun systemWebViewMajor(): Int? {
        for (pkg in arrayOf("com.google.android.webview", "com.android.webview")) {
            try {
                val info = packageManager.getPackageInfo(pkg, 0)
                info.versionName?.substringBefore('.')?.toIntOrNull()?.let { return it }
            } catch (_: Exception) {
                // try next package
            }
        }
        return null
    }

    private fun configuredMinWebViewVersion(): Int? =
        try {
            bridge?.config?.minWebViewVersion
        } catch (_: Exception) {
            null
        }

    // ------------------------------------------------------------------ C4.2

    /**
     * Native D-pad fallback (ADR-004 binding condition 2). The ratified v1 is JS-only;
     * this path exists so that if the on-device TV runtime check fails, dispatches can
     * be forwarded into the WebView as synthesised moves without changing the flavour
     * structure. Gated on BuildConfig.TV_FLAVOUR so the mobile flavour is unaffected.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (BuildConfig.TV_FLAVOUR && event.keyCode in DPAD_KEYS) {
            val dir = when (event.keyCode) {
                KeyEvent.KEYCODE_DPAD_UP -> "up"
                KeyEvent.KEYCODE_DPAD_DOWN -> "down"
                KeyEvent.KEYCODE_DPAD_LEFT -> "left"
                KeyEvent.KEYCODE_DPAD_RIGHT -> "right"
                else -> null
            }
            if (dir != null && event.action == KeyEvent.ACTION_DOWN) {
                val wv = webView
                if (wv != null && !unsupportedShown) {
                    // window.__radarDpad is installed by the TV nav engine; absent on
                    // the phone product, where this branch never runs.
                    wv.evaluateJavascript("window.__radarDpad && window.__radarDpad('$dir');", null)
                    return true
                }
            }
        }
        return super.dispatchKeyEvent(event)
    }

    // ------------------------------------------------------------------ lifecycle

    override fun onPause() {
        super.onPause()
        // I3: do not keep authenticated pages in the render tree while backgrounded.
        webView?.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
        if (!unsupportedShown) {
            // Re-check on resume: the user may have updated System WebView.
            webView?.let { enforceWebViewGate(it) }
        }
    }
}
