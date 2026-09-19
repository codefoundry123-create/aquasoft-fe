import { PluginListenerHandle, registerPlugin } from '@capacitor/core';
import {
  AdLoadedEvent,
  AdFailedToLoadEvent,
  AdOpenedEvent,
  AdDismissedEvent,
  AdFailedToShowEvent,
  AdAlreadyOpenedEvent,
} from './interface/AppOpenAdInterface';

export interface AppOpenAd {
  addListener(eventName: 'adLoaded', listenerFunc: (info: AdLoadedEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adFailedToLoad', listenerFunc: (info: AdFailedToLoadEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adOpened', listenerFunc: (info: AdOpenedEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adAlreadyOpened', listenerFunc: (info: AdAlreadyOpenedEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adDismissed', listenerFunc: (info: AdDismissedEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adFailedToShow', listenerFunc: (info: AdFailedToShowEvent) => void): PluginListenerHandle;
  addListener(eventName: 'adLoadCancelled', listenerFunc: (info: AdFailedToShowEvent) => void): PluginListenerHandle;

  loadAd(options: { adUnitId: string }): Promise<void>;
  showAd(): Promise<void>;
  cancelAdRequest(): Promise<void>; 
}

export const AppOpenAd = registerPlugin<AppOpenAd>('AppOpenAd');
