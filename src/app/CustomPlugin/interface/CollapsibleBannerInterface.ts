
export interface ShowBannerOptions {
  adUnitId: string;
  collapsiblePosition?: 'top' | 'bottom';
  marginBottom?: number;
}

export interface BannerResponse {
  status: 'loaded' | 'shown' | 'hidden' | 'destroyed' | 'already_shown' | 'already_hidden';
  collapsible?: boolean;
  errorCode?: number;
  message?: string;
}

export interface CollapsibleBannerAdPlugin {
  showCollapsibleBanner(options: ShowBannerOptions): Promise<any>;
  hideBanner(): Promise<BannerResponse>;
  showHiddenBanners(): Promise<BannerResponse>;
  destroyCollapsibleBanner(): Promise<BannerResponse>;
  addListener(
    eventName: 'onBannerLoaded' | 'onBannerHidden' | 'onBannerShown' | 'onBannerDestroyed' | 'onBannerFailed',
    listenerFunc: (data: any) => void
  ): Promise<void>;
}
