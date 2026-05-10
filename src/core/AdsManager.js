import { IMA_SDK_URL, IMA_TEST_AD_TAG } from "../utils/constants.js";
import { defaultLogger } from "../utils/logger.js";
import { UI_STRINGS } from "../utils/strings.js";

/**
 * Handles Google IMA SDK initialization and ad playback.
 */
export class AdsManager {
  /**
   * @param {object} [options]
   * @param {string} [options.containerId]
   * @param {string} [options.videoId]
   * @param {string} [options.adTagUrl]
   * @param {number} [options.timeoutMs]
   * @param {number} [options.maxRetries]
   * @param {number} [options.retryDelayMs]
   * @param {object} [options.logger]
   */
  constructor({
    containerId = "ad-container",
    videoId = "ad-video",
    adTagUrl = IMA_TEST_AD_TAG,
    timeoutMs = 8000,
    maxRetries = 1,
    retryDelayMs = 500,
    logger = defaultLogger,
  } = {}) {
    this.container = document.getElementById(containerId);
    this.video = document.getElementById(videoId);
    this.adTagUrl = adTagUrl;
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this.retryDelayMs = retryDelayMs;
    this.logger = logger;

    this.adDisplayContainer = null;
    this.adsLoader = null;
    this.adsManager = null;
    this.initialized = false;
    this.playing = false;
    this.fallbackEl = null;
    this.fallbackTitleEl = null;
    this.fallbackBodyEl = null;
    this.resolveAd = null;
    this.activeTimeoutId = null;
    this.retryCount = 0;
    this.lastRequestDims = null;
  }

  /**
   * Loads the IMA SDK script once.
   * @returns {Promise<void>}
   */
  static loadSdk() {
    if (AdsManager.sdkPromise) {
      return AdsManager.sdkPromise;
    }

    AdsManager.sdkPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.ima) {
        resolve();
        return;
      }

      if (!document || !document.head) {
        reject(new Error("No document available for SDK load"));
        return;
      }

      const script = document.createElement("script");
      script.src = IMA_SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("IMA SDK load failed"));
      document.head.appendChild(script);
    });

    return AdsManager.sdkPromise;
  }

  /**
   * Initializes the ad display container inside a user gesture.
   * @returns {Promise<boolean>}
   */
  async prime() {
    if (this.initialized) {
      return true;
    }

    try {
      await AdsManager.loadSdk();
    } catch (error) {
      this.logger.warn("IMA SDK load failed", error);
      return false;
    }

    if (!this.container || !this.video) {
      this.logger.warn("Ad container or video element missing");
      return false;
    }

    try {
      this.adDisplayContainer = new window.google.ima.AdDisplayContainer(
        this.container,
        this.video,
      );
      this.adDisplayContainer.initialize();
      this.initialized = true;
      return true;
    } catch (error) {
      this.logger.warn("Ad display container init failed", error);
      return false;
    }
  }

  /**
   * Requests and plays a single ad.
   * @param {object} [options]
   * @param {number} [options.width]
   * @param {number} [options.height]
   * @returns {Promise<void>}
   */
  async playAd({ width, height } = {}) {
    if (this.playing) {
      this.logger.warn("Ad already playing; ignoring request");
      return Promise.resolve();
    }

    const ready = await this.prime();
    if (!ready) {
      this.showFallback(UI_STRINGS.adFallbackTitle, UI_STRINGS.adFallbackBody);
      this.scheduleFallbackHide();
      return Promise.resolve();
    }

    this.playing = true;
    this.retryCount = 0;
    this.lastRequestDims = { width, height };
    this.show();
    this.showFallback(UI_STRINGS.adLoadingTitle, "");

    return new Promise((resolve) => {
      this.resolveAd = resolve;
      this.requestAds({ width, height });
    });
  }

  /**
   * @param {object} [options]
   * @param {number} [options.width]
   * @param {number} [options.height]
   */
  requestAds({ width, height } = {}) {
    const dims = this.lastRequestDims || { width, height };
    const targetWidth = dims.width;
    const targetHeight = dims.height;
    if (!this.adDisplayContainer) {
      this.finishWithError("Ad display container missing");
      return;
    }

    this.clearTimeout();
    this.activeTimeoutId = window.setTimeout(() => {
      this.logger.warn("Ad request timed out");
      this.retryOrFail("timeout");
    }, this.timeoutMs);

    this.adsLoader = new window.google.ima.AdsLoader(this.adDisplayContainer);
    this.adsLoader.addEventListener(
      window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (event) => this.onAdsManagerLoaded(event, width, height),
      false,
    );
    this.adsLoader.addEventListener(
      window.google.ima.AdErrorEvent.Type.AD_ERROR,
      (event) => this.onAdError(event),
      false,
    );

    const adsRequest = new window.google.ima.AdsRequest();
    adsRequest.adTagUrl = this.adTagUrl;
    adsRequest.linearAdSlotWidth = targetWidth || this.container.clientWidth;
    adsRequest.linearAdSlotHeight = targetHeight || this.container.clientHeight;
    adsRequest.nonLinearAdSlotWidth = adsRequest.linearAdSlotWidth;
    adsRequest.nonLinearAdSlotHeight = Math.floor(
      adsRequest.linearAdSlotHeight / 3,
    );

    try {
      this.adsLoader.requestAds(adsRequest);
    } catch (error) {
      this.logger.warn("Ads request failed", error);
      this.retryOrFail("request_failed");
    }
  }

  /**
   * @param {google.ima.AdsManagerLoadedEvent} event
   * @param {() => void} resolve
   * @param {number} [width]
   * @param {number} [height]
   */
  onAdsManagerLoaded(event, width, height) {
    try {
      this.adsManager = event.getAdsManager(this.video);
      this.attachAdEvents();

      const w = width || this.container.clientWidth;
      const h = height || this.container.clientHeight;
      this.adsManager.init(w, h, window.google.ima.ViewMode.NORMAL);
      this.adsManager.start();
      this.hideFallback();
    } catch (error) {
      this.logger.warn("Ads manager init failed", error);
      this.retryOrFail("init_failed");
    }
  }

  /**
   * @param {google.ima.AdErrorEvent} event
   * @param {() => void} resolve
   */
  onAdError(event) {
    if (event && event.getError) {
      this.logger.warn("Ad error:", event.getError().toString());
    }
    this.retryOrFail("ad_error");
  }

  /**
   * @param {() => void} resolve
   */
  attachAdEvents() {
    if (!this.adsManager) {
      return;
    }

    const completeTypes = [
      window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      window.google.ima.AdEvent.Type.COMPLETE,
    ];

    for (const type of completeTypes) {
      this.adsManager.addEventListener(type, () => this.finish());
    }

    this.adsManager.addEventListener(
      window.google.ima.AdErrorEvent.Type.AD_ERROR,
      () => this.finish(),
    );

    this.adsManager.addEventListener(
      window.google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      () => this.finish(),
    );
  }

  /**
   * Cleans up ad playback and hides the overlay.
   * @param {() => void} resolve
   */
  /**
   * @param {object} [options]
   * @param {boolean} [options.keepVisible]
   */
  finish({ keepVisible = false } = {}) {
    if (this.adsManager) {
      try {
        this.adsManager.destroy();
      } catch (error) {
        this.logger.warn("Ads manager destroy failed", error);
      }
    }

    this.adsManager = null;
    this.adsLoader = null;
    this.adDisplayContainer = null;
    this.initialized = false;
    this.playing = false;
    this.clearTimeout();
    if (!keepVisible) {
      this.hide();
    }

    if (this.resolveAd) {
      this.resolveAd();
      this.resolveAd = null;
    }
  }

  /**
   * @param {string} reason
   */
  retryOrFail(reason) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      this.logger.warn("Retrying ad", { reason, attempt: this.retryCount });
      this.showFallback(UI_STRINGS.adLoadingTitle, "");
      window.setTimeout(() => this.requestAds(), this.retryDelayMs);
      return;
    }

    this.finishWithError(reason);
  }

  /**
   * @param {string} reason
   */
  finishWithError(reason) {
    this.logger.warn("Ad failed", { reason });
    this.show();
    this.showFallback(UI_STRINGS.adFallbackTitle, UI_STRINGS.adFallbackBody);
    this.finish({ keepVisible: true });
    this.scheduleFallbackHide();
  }

  clearTimeout() {
    if (this.activeTimeoutId) {
      window.clearTimeout(this.activeTimeoutId);
      this.activeTimeoutId = null;
    }
  }

  /**
   * Shows the ad overlay container.
   */
  show() {
    if (this.container) {
      this.container.style.display = "flex";
    }
  }

  /**
   * Hides the ad overlay container.
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  ensureFallback() {
    if (!this.container) {
      return;
    }

    if (!this.fallbackEl) {
      this.fallbackEl = document.createElement("div");
      this.fallbackEl.className = "ad-fallback";

      this.fallbackTitleEl = document.createElement("div");
      this.fallbackTitleEl.className = "ad-fallback__title";

      this.fallbackBodyEl = document.createElement("div");
      this.fallbackBodyEl.className = "ad-fallback__body";

      this.fallbackEl.appendChild(this.fallbackTitleEl);
      this.fallbackEl.appendChild(this.fallbackBodyEl);
      this.container.appendChild(this.fallbackEl);
    }
  }

  /**
   * @param {string} title
   * @param {string} body
   */
  showFallback(title, body) {
    this.ensureFallback();
    if (!this.fallbackEl || !this.fallbackTitleEl || !this.fallbackBodyEl) {
      return;
    }

    this.fallbackTitleEl.textContent = title;
    this.fallbackBodyEl.textContent = body;
    this.fallbackEl.style.display = "grid";
  }

  hideFallback() {
    if (this.fallbackEl) {
      this.fallbackEl.style.display = "none";
    }
  }

  scheduleFallbackHide() {
    window.setTimeout(() => {
      this.hideFallback();
      this.hide();
    }, 1200);
  }
}

AdsManager.sdkPromise = null;
