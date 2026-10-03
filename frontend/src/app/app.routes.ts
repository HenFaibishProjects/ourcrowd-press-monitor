import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./features/about/about.component').then(
        (m) => m.AboutComponent,
      ),
  },
  {
    path: 'ai-assistance',
    loadComponent: () =>
      import('./features/ai-assistance/ai-assistance.component').then(
        (m) => m.AiAssistanceComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
