import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './services/components/authentication.service';
//import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

//@UntilDestroy()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {

  constructor(private authService: AuthenticationService) { }

  ngOnInit() {
    // Initialize user state if already logged in
    if (this.authService.isLoggedIn()) {
      this.authService.updateUserDetails();
    }
  }
}
