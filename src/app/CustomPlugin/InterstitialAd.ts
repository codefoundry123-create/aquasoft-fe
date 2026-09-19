import { registerPlugin } from '@capacitor/core';

export interface InterstitialAdPlugin {
  loadAd(options: { adId: string }): Promise<void>;
  showAd(): Promise<void>;
  isAdLoaded(): Promise<{ isLoaded: boolean }>;
  addListener(eventName: 'Loaded', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'FailedToLoad', listenerFunc: (data: any) => void): Promise<any>;
  addListener(eventName: 'Showed', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'Dismissed', listenerFunc: () => void): Promise<any>;
  addListener(eventName: 'FailedToShow', listenerFunc: (data: any) => void): Promise<any>;
}

export const InterstitialAd = registerPlugin<InterstitialAdPlugin>('InterstitialAdPlugin');

// ✅ Constants (optional)
export const InterstitialAdEvents = {
  Loaded: 'Loaded',
  FailedToLoad: 'FailedToLoad',
  Showed: 'Showed',
  Dismissed: 'Dismissed',
  FailedToShow: 'FailedToShow',
} as const;

export type InterstitialAdEventKeys = keyof typeof InterstitialAdEvents;
