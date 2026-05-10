const SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";
const DEFAULT_AD_TAG =
  "https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/124319096/external/single_ad_samples&ciu_szs=300x250&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&cust_params=deployment%3Ddevsite%26sample_ct%3Dlinear&correlator=";

export class AdsManager {
  constructor({
    containerId = "ad-container",
    videoId = "ad-video",
    adTagUrl = DEFAULT_AD_TAG,
  } = {}) {
    this.container = document.getElementById(containerId);
    this.video = document.getElementById(videoId);
    this.adTagUrl = adTagUrl;

    this.adDisplayContainer = null;
    this.adsLoader = null;
    this.adsManager = null;
    this.initialized = false;
  }

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
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("IMA SDK load failed"));
      document.head.appendChild(script);
    });

    return AdsManager.sdkPromise;
  }

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

  onAdError(event, resolve) {
    if (event && event.getError) {
      console.warn("Ad error:", event.getError().toString());
    }
    this.finish(resolve);
  }

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

  show() {
    if (this.container) {
      this.container.style.display = "flex";
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }
}

AdsManager.sdkPromise = null;
