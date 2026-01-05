import { Component, inject, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { EnterpriseService } from '../../../services/components/enterprise.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Enterprise } from '../../../models/components/enterprise';
import { Site } from '../../../models/components/sites';

@Component({
  selector: 'app-sales-site-modal',
  templateUrl: './sales-site-modal.component.html',
  styleUrl: './sales-site-modal.component.css'
})
export class SalesSiteModalComponent {

  authService = inject(AuthenticationService);
  enterpriseService = inject(EnterpriseService);
  router = inject(Router);

  siteForm!: FormGroup;
  allSites: any[] = [];
  input_site!: Site;


  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    public dialogRef: MatDialogRef<SalesSiteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    //this.allSites = data.allSites;
    this.input_site = data.currentSite
    console.log("Input Site : " + this.input_site.address);
    this.getEnterpriseInfos();
    this.siteForm = this.fb.group({
      salesSite: [data.currentSite.id, Validators.required]
    });
  }

  confirm() {
    if (this.siteForm.valid) {
      const selectedSiteId = this.siteForm.value.salesSite;
      // Find the complete site object
      const selectedSite = this.allSites.find(site => site.id === selectedSiteId);
      console.log("Site before close:", selectedSite);  // Proper object logging
      this.dialogRef.close(selectedSite);  // Return the full site object
    }
  }

  getEnterpriseInfos() {
    var id: number;
    console.log("this.authService.getEnterpriseId() : Response: ");
    if (this.authService.isLoggedIn()) {
      let _id = this.authService.getEnterpriseId();
      id = Number.parseInt(_id!);
      console.log("this.authService.getEnterpriseId() : ", id);
    } else {
      id = 0;
      this.toastr.error("Vous de devez vous connecter");
      this.router.navigateByUrl('/login');
    }
    this.enterpriseService.getEnterpriseInfo(id).subscribe({
      next: (response: Enterprise) => {
        this.allSites = response.sites!;
      }, error: (error) => {
        this.toastr.error(error.message);
        this.toastr.show("Réessayer plus tard");
      }
    });
  }

}
