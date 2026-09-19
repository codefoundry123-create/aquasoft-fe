import { registerPlugin } from '@capacitor/core';
import { CollapsibleBannerAdPlugin } from './interface/CollapsibleBannerInterface';

export const CollapsibleBanner = registerPlugin<CollapsibleBannerAdPlugin>('CollapsibleBannerAd');