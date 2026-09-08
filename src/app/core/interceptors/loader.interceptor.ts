import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { LoaderService } from '../services/loader.service';

/** Drives the global top progress bar for every outbound request. */
export const loaderInterceptor: HttpInterceptorFn = (req, next) => {
  const loader = inject(LoaderService);
  loader.start();
  return next(req).pipe(finalize(() => loader.stop()));
};
