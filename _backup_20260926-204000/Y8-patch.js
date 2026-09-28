 // Y8-patch.js - PRE-BUILT BUNDLE COMPATIBLE INTEGRATION
(function() {
    "use strict";
    let y8Sdk = null;
    let sdkInitialized = false;

    function initSDK() {
        if (sdkInitialized || !window.y8) return;
        sdkInitialized = true;

        try {
            y8Sdk = window.y8.sdk();
            y8Sdk.init(
                { appId: '6aae009af6ff2af4b2caf1df', autoLogin: true },
                { gameId: '283751', preloadAdBreaks: 'on', sound: 'on' }
            );

            y8Sdk.onAuth((user, error) => {
                if (error) console.warn("[Y8] Auth error:", error);
                else if (user) console.log("[Y8] User authenticated:", user.displayName);
            });

            console.log("[Y8] SDK initialized successfully (async mode)");
        } catch(e) {
            console.error("[Y8] SDK init failed:", e);
        }
    }

    // Initialize SDK as soon as possible, but DON'T block game start
    window.addEventListener("y8sdk.ready", initSDK, { once: true });
    if (window.y8 && window.y8.emitReadyEvent) {
        window.y8.emitReadyEvent();
        initSDK();
    }

    // Expose ad functions globally IMMEDIATELY
    // The pre-built game can call these at any time
    window.showRewardedAd = function() {
        if (!y8Sdk) {
            console.warn("[Y8] showRewardedAd called before SDK ready");
            return Promise.reject("SDK not ready");
        }
        return y8Sdk.showAd({
            type: "reward", name: "extra-life",
            beforeAd: () => {}, afterAd: () => {},
            beforeReward: (fn) => fn(),
            adDismissed: () => {}, adViewed: () => {},
            adBreakDone: () => {}
        });
    };

    window.showMidgameAd = function() {
        if (!y8Sdk) {
            console.warn("[Y8] showMidgameAd called before SDK ready");
            return Promise.reject("SDK not ready");
        }
        return y8Sdk.showAd({
            type: "next", name: "level-complete",
            beforeAd: () => {}, afterAd: () => {},
            adBreakDone: () => {}
        });
    };

    console.log("[Y8-Patch] Loaded in async mode. Game starts independently.");
})();