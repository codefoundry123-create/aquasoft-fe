import { registerPlugin } from '@capacitor/core';
export interface BannerAdsPlugin {
  showBanner(options: {
    adId: string;
    type?: | 'banner' | 'large_banner' | 'medium_rectangle' | 'full_banner'| 'leaderboard' | 'adaptive' | 'inline';
    position?: 'top' | 'bottom';
    collapsible?: boolean;
    margin?: number; // 🆕 margin in dp
  }): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  removeBanner(): Promise<void>;
  // 🎧 Event Listeners
  addListener(
    eventName: 'onAdLoaded',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onAdFailedToLoad',
    listenerFunc: (error: { message: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'onAdOpened' | 'onAdClosed',
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
}
export interface PluginListenerHandle {
  remove: () => Promise<void>;
}

const BannerAds = registerPlugin<BannerAdsPlugin>('BannerAds');
export { BannerAds };