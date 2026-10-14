package com.kasane.shell

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var rootBridge: RootBridge

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Immersive dark status bar
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }

            webViewClient = object : WebViewClient() {}
            webChromeClient = object : WebChromeClient() {}
        }

        rootBridge = RootBridge(this, webView)
        webView.addJavascriptInterface(rootBridge, "AndroidRoot")

        // Load offline packaged web interface
        webView.loadUrl("file:///android_asset/web/index.html")

        setContentView(webView)
    }

    override fun onBackPressed() {
        // Evaluate if terminal sheet or modal is open before closing app
        webView.evaluateJavascript(
            "(function() { " +
            "  var sheet = document.getElementById('terminal-sheet');" +
            "  if (sheet && sheet.classList.contains('open')) { closeTerminalSheet(); return true; }" +
            "  var modal = document.getElementById('editor-modal');" +
            "  if (modal && !modal.classList.contains('hidden')) { closeEditorModal(); return true; }" +
            "  return false;" +
            "})()"
        ) { result ->
            if (result != "true") {
                super.onBackPressed()
            }
        }
    }
}
