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

        // Immersive fullscreen surface
        @Suppress("DEPRECATION")
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
                cacheMode = WebSettings.LOAD_DEFAULT
                useWideViewPort = true
                loadWithOverviewMode = true
                // No network permission is declared, so nothing can leave the device.
                // This makes that a guarantee rather than a convention.
                blockNetworkLoads = true
            }

            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
        }

        rootBridge = RootBridge(this)
        webView.addJavascriptInterface(rootBridge, "AndroidRoot")

        // Load the offline packaged interface
        webView.loadUrl("file:///android_asset/web/index.html")

        setContentView(webView)
    }

    @Deprecated("Back handling is delegated to the page until nothing is open")
    override fun onBackPressed() {
        // Let the page dismiss an open dialog first; close the app only when nothing is open.
        webView.evaluateJavascript(
            "(function(){ return typeof window.onNativeBackPressed === 'function' " +
                "? window.onNativeBackPressed() === true : false; })()"
        ) { result ->
            if (result != "true") {
                @Suppress("DEPRECATION")
                super.onBackPressed()
            }
        }
    }

    override fun onPause() {
        super.onPause()
        // Polling must not survive the app going to the background.
        webView.evaluateJavascript(
            "if (typeof window.onNativePause === 'function') window.onNativePause();",
            null
        )
    }

    override fun onResume() {
        super.onResume()
        webView.evaluateJavascript(
            "if (typeof window.onNativeResume === 'function') window.onNativeResume();",
            null
        )
    }
}
