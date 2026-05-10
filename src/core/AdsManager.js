import { IMA_SDK_URL, IMA_TEST_AD_TAG } from "../utils/constants.js";

/**
 * Handles Google IMA SDK initialization and ad playback.
 */
export class AdsManager {
  /**
   * @param {object} [options]
   * @param {string} [options.containerId]
   * @param {string} [options.videoId]
   * @param {string} [options.adTagUrl]
   */
  constructor({
    containerId = "ad-container",
    videoId = "ad-video",
    adTagUrl = IMA_TEST_AD_TAG,
  } = {}) {
    this.container = document.getElementById(containerId);
    this.video = document.getElementById(videoId);
    this.adTagUrl = adTagUrl;

    this.adDisplayContainer = null;
    this.adsLoader = null;
    this.adsManager = null;
    this.initialized = false;
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
      return false;
    }

    if (!this.container || !this.video) {
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
    const ready = await this.prime();
    if (!ready) {
      return Promise.resolve();
    }

    this.show();

    return new Promise((resolve) => {
      this.adsLoader = new window.google.ima.AdsLoader(this.adDisplayContainer);
      this.adsLoader.addEventListener(
        window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
        (event) => this.onAdsManagerLoaded(event, resolve, width, height),
        false,
      );
      this.adsLoader.addEventListener(
        window.google.ima.AdErrorEvent.Type.AD_ERROR,
        (event) => this.onAdError(event, resolve),
        false,
      );

      const adsRequest = new window.google.ima.AdsRequest();
      adsRequest.adTagUrl = this.adTagUrl;
      adsRequest.linearAdSlotWidth = width || this.container.clientWidth;
      adsRequest.linearAdSlotHeight = height || this.container.clientHeight;
      adsRequest.nonLinearAdSlotWidth = adsRequest.linearAdSlotWidth;
      adsRequest.nonLinearAdSlotHeight = Math.floor(
        adsRequest.linearAdSlotHeight / 3,
      );

      this.adsLoader.requestAds(adsRequest);
    });
  }

  /**
   * @param {google.ima.AdsManagerLoadedEvent} event
   * @param {() => void} resolve
   * @param {number} [width]
   * @param {number} [height]
   */
  onAdsManagerLoaded(event, resolve, width, height) {
    try {
      this.adsManager = event.getAdsManager(this.video);
      this.attachAdEvents(resolve);

      const w = width || this.container.clientWidth;
      const h = height || this.container.clientHeight;
      this.adsManager.init(w, h, window.google.ima.ViewMode.NORMAL);
      this.adsManager.start();
    } catch (error) {
      this.finish(resolve);
    }
  }

  /**
   * @param {google.ima.AdErrorEvent} event
   * @param {() => void} resolve
   */
  onAdError(event, resolve) {
    if (event && event.getError) {
      console.warn("Ad error:", event.getError().toString());
    }
    this.finish(resolve);
  }

  /**
   * @param {() => void} resolve
   */
  attachAdEvents(resolve) {
    if (!this.adsManager) {
      return;
    }

    const completeTypes = [
      window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED,
      window.google.ima.AdEvent.Type.COMPLETE,
    ];

    for (const type of completeTypes) {
      this.adsManager.addEventListener(type, () => this.finish(resolve));
    }

    this.adsManager.addEventListener(
      window.google.ima.AdErrorEvent.Type.AD_ERROR,
      () => this.finish(resolve),
    );

    this.adsManager.addEventListener(
      window.google.ima.AdEvent.Type.CONTENT_RESUME_REQUESTED,
      () => this.finish(resolve),
    );
  }

  /**
   * Cleans up ad playback and hides the overlay.
   * @param {() => void} resolve
   */
  finish(resolve) {
    if (this.adsManager) {
      try {
        this.adsManager.destroy();
      } catch (error) {
        console.warn("Ads manager destroy failed", error);
      }
    }

    this.adsManager = null;
    this.adsLoader = null;
    this.adDisplayContainer = null;
    this.initialized = false;
    this.hide();

    resolve();
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
}

AdsManager.sdkPromise = null;
