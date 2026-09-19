
export interface AdLoadedEvent {
  AppOpenAdLoad: boolean;
}

export interface AdFailedToLoadEvent {
  error: string;
}

export interface AdOpenedEvent {
  AppOpenOpened: boolean;
}

export interface AdAlreadyOpenedEvent {
  AppOpenAlreadyOpened: boolean;
}

export interface AdDismissedEvent {
  AppOpenDismissed: boolean;
}

export interface AdFailedToShowEvent {
  error: string;
}

export interface AppOpenAdPluginListeners {
  /**
   * Called when an ad is successfully loaded.
   *
   * @param event The event data.
   */
  adLoaded: (event: AdLoadedEvent) => void;

  /**
   * Called when an ad fails to load.
   *
   * @param event The event data containing the error message.
   */
  adFailedToLoad: (event: AdFailedToLoadEvent) => void;

  /**
   * Called when an ad is opened and presented to the user.
   *
   * @param event The event data.
   */
  adOpened: (event: AdOpenedEvent) => void;

  /**
   * Called when an ad is opened and presented to the user.
   *
   * @param event The event data.
   */
  adAlreadyOpened: (event: AdAlreadyOpenedEvent) => void;

  /**
   * Called when an ad is dismissed by the user.
   *
   * @param event The event data.
   */
  adDismissed: (event: AdDismissedEvent) => void;

  /**
   * Called when an ad fails to show after being loaded.
   *
   * @param event The event data containing the error message.
   */
  adFailedToShow: (event: AdFailedToShowEvent) => void;
}
