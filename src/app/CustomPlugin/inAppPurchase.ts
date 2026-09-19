import { registerPlugin } from '@capacitor/core';
import { SubscriptionPlugin } from '../CustomPlugin/interface/inAppPurchaseInterface';

const SubscriptionManager = registerPlugin<SubscriptionPlugin>('SubscriptionManager');

export { SubscriptionManager };
