import { enableProdMode, importProvidersFrom , ErrorHandler, Injectable, APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import * as Sentry from '@sentry/browser';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { IonicModule } from '@ionic/angular';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app/app.routes';
import { register } from 'swiper/element/bundle';
register();

FirebaseCrashlytics.setEnabled({enabled: true});

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Global error detector
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  async handleError(error: any): Promise<void> {
    const errorMsg = error?.orginalError || error;

    if (environment.production) {
      Sentry.captureException(errorMsg);

      try {
        await FirebaseCrashlytics.recordException({
          message: errorMsg?.message || errorMsg.toString()
        });

        await FirebaseCrashlytics.log({
          message: `Global Error: ${errorMsg?.stack || 'No stack trace'}`
        });
      } catch (crashlyticsError) {
        console.warn("Failed to report to Crashlytics:", crashlyticsError);
      }
    }
    else {
      console.log("*#*ERROR:", errorMsg);
    }
  }
}


Sentry.init({
  dsn: environment.sentryKey,
  environment: environment.name,
  tracesSampleRate: 1,
  ignoreErrors: [
    "localhost",
    "No fill.",
    "error, headers, message",
    "error, headers, message, name, ok",
    "Network error.",
    "There is no data on the clipboard"
  ],
  release: environment.versionName, //@release
});

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideIonicAngular(),
    importProvidersFrom(
      IonicModule.forRoot({}),
      RouterModule.forRoot(routes),
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    ),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ]
})
  .catch(err => console.error(err));


