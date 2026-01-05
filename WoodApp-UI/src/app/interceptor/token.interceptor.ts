import { HttpInterceptorFn } from '@angular/common/http';
import { AuthenticationService } from '../services/components/authentication.service';
import { inject } from '@angular/core';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthenticationService);

  if (authService.getToken()) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', 'Bearer' + authService.getToken())
    })

    return next(cloned);
  }
  return next(req);
};
