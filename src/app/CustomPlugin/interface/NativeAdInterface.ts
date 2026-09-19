
export interface NativeAdData {
  headline?: string;
  body?: string;
  imageUrl?: string | null;
  price?: string;
  starRating?: number;
  size?: string;
  callToAction?: string;
  advertiser?: string;
  iconUrl?: string | null;
  store?: string;
  hasVideo?: boolean;
}

export interface AdLoadError {
  errorCode: number;
  message: string;
}

export interface NativeAdPluginListeners {
  /**
   * Called when a native ad is successfully loaded.
   *
   * @param data The native ad data.
   */
  onAdLoaded: (data: NativeAdData) => void;

  /**
   * Called when a native ad fails to load.
   *
   * @param error The error information.
   */
  onAdFailedToLoad: (error: AdLoadError) => void;

  /**
   * Called when the native ad is clicked.
   */
  onAdClicked: () => void;

  /**
   * Called when an impression is recorded for the native ad.
   */
  onAdImpression: () => void;

  /**
   * Called when the native ad opens an overlay.
   */
  onAdOpened: () => void;

  /**
   * Called when the native ad closes an overlay.
   */
  onAdClosed: () => void;
}
