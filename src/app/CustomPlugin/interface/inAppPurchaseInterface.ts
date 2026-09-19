export interface SubscribeOptions {
    productId: string;
    type: 'inapp' | 'subs'; // consumable or subscription
  }

  export interface SubscribeResult {
    productId: string;
    purchaseToken: string;
  }

  export interface Product {
    productId: string;
    title: string;
    description: string;
    price: string;
  }

  export interface SubscriptionPlugin {
    getProducts(options: { productIds: string[]; type: 'subs' | 'inapp' }): Promise<{ products: Product[] }>;
    purchase(options: SubscribeOptions): Promise<SubscribeResult>;
    getActivePurchases(): Promise<any>;

    // Add listener events here
    addListener(eventName: 'billingConnected', listenerFunc: () => void): void;
    addListener(eventName: 'billingDisconnected', listenerFunc: () => void): void;
    addListener(eventName: 'purchaseAcknowledged', listenerFunc: (data: any) => void): void;
    addListener(eventName: 'purchaseCompleted', listenerFunc: (data: any) => void): void;
    addListener(eventName: 'purchaseFailed', listenerFunc: (error: any) => void): void;
  }
