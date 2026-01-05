import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthenticationService } from '../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';

export const authGuard: CanActivateFn = (route, state) => {

  if (inject(AuthenticationService).isLoggedIn()) {
    return true;
  }
  // inject(ToastrService).warning("Vous devez vous connecter d'abord!");
  inject(Router).navigate(['/login']);
  return false;
};
