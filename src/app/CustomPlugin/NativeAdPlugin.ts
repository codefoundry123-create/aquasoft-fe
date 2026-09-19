import { registerPlugin } from '@capacitor/core';

export interface NativeAdPlugin {
  loadNativeAd(options: { adUnitId: string; }): Promise<{ adId: string; status: 'loaded' }>;
  showNativeAd(options: { adId: string; x: number; y?: number; width: number; height?: number; bottomMargin?:number; 
    layoutType?: 
    'small' 
    | 'medium' 
    | 'medium_small'
    | 'lang_medium_native'
    | 'welcome_medium_native'
    | 'intro_small'
    | 'intro_full'
    | 'home_medium_native'
    | 'history_medium_native'
    | 'reminder_medium_native'
    | 'setting_medium_native'
    | 'user_form_medium_native'
    | 'exit_native_ad'
  }): Promise<{ adId: string; status: 'displayed' }>;
  hideNativeAd(options: { adId: string }): Promise<{ adId: string; status: 'hidden' }>;
  resumeNativeAd(options: { adId: string }): Promise<{ adId: string; status: 'resume' }>;
  removeNativeAd(options: { adId: string }): Promise<{ adId: string; status: 'removed' }>;
  cancelNativeAdRequest(options: { requestId: string }): Promise<{ requestId: string; status: 'cancelled' }>;

  // Listeners for events
  addListener(eventName: 'onAdLoaded', listenerFunc: (info: any) => void): any;
  addListener(eventName: 'onAdClicked', listenerFunc: (info: any) => void): any;
  addListener(eventName: 'onAdImpression', listenerFunc: (info: any) => void): any;
  addListener(eventName: 'onAdFailed', listenerFunc: (info: any) => void): any;
  addListener(eventName: 'onNativeAdAction', listenerFunc: (info: any) => void): any;
}

export const NativeAd = registerPlugin<NativeAdPlugin>('NativeAd');
