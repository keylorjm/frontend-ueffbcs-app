// app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch
} from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor'; // OJO: nombre en minúsculas si es función

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideZonelessChangeDetection(),
    provideRouter(routes),

    provideHttpClient(
      withFetch(),                 // <-- SSR: recomendado
      withInterceptors([AuthInterceptor]) // <-- interceptor funcional
    ),
  ],
};
