import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';

export const roleGuard: CanActivateFn = (route, state) => {
  const roles = route.data['roles'] as string[];

  const authService = inject(AuthenticationService);
  const toastr = inject(ToastrService);
  const router = inject(Router);

  const userRole = authService.getRole();
  // console.log("ROLE GUARD userRole is :", userRole);
  // console.log("ROLE GUARD route.data['role'] is :", roles)

  if (!authService.isLoggedIn()) {
    // console.log("ROLE GUARD IsLoggedIn", !authService.isLoggedIn())
    router.navigate(['/login']);
    toastr.error("Vous devez vous connecter pour voir cette page");

    return false;
  }

  if (roles.some((role) => userRole?.includes(role))) return true;

  toastr.info("Accés refusé");

  return false;

};
