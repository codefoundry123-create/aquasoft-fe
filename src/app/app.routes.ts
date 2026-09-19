import { Routes } from '@angular/router';
import { HistoryComponent } from './history/history.component';
import { SettingsComponent } from './settings/settings.component';
import { ReminderComponent } from './reminder/reminder.component';
import { TutorialComponent } from './tutorial/tutorial.component';
import { LanguageComponent } from './language/language.component';
import { SubscriptionComponent } from './subscription/subscription.component';
import { WelcomeScreenComponent } from './welcome-screen/welcome-screen.component';
import { MainComponent } from './main/main.component';
import { UserFormComponent } from './user-form/user-form.component';
import { ExitPopupComponent } from './exit.popup/exit.popup.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'welcome',
    // redirectTo: 'tutorial',
    pathMatch: 'full'
  },
  {
    path: 'welcome',
    component: WelcomeScreenComponent
  },
  {
    path: 'main',
    component: MainComponent
  },
  {
    path: 'history',
    component: HistoryComponent
  },
  {
    path: 'settings',
    component: SettingsComponent
  }, 
  {
    path: 'reminder',
    component: ReminderComponent
  },
  {
    path: 'subscribe',
    component: SubscriptionComponent
  },
  {
    path: 'user-form',
    component: UserFormComponent
  },
  {
    path: 'tutorial',
    component: TutorialComponent
  },
  {
    path: 'language',
    component: LanguageComponent
  },
  {
    path: 'exit',
    component: ExitPopupComponent
  }
];
