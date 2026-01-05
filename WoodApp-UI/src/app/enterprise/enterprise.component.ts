import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ASK_FOR_WOOD_SELLEING, MAT_CARD_HEADER_DETAILS, MAT_CARD_HEADER_ENTER_SITES, MAT_CARD_HEADER_ENTERPRISE, MAT_CARD_SETTINGS_CONFIG, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_ADRESSE, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CITY, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CODEPOST, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_DEVISE, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_MF, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_POSITION, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_NAME, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_SURNAME, MAT_INPUT_ENTERPRISE_PLCHOLDER_DESC, MAT_INPUT_ENTERPRISE_PLCHOLDER_EMAIL, MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_1, MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_2, MAT_INPUT_ENTERPRISE_PLCHOLDER_NAME, MAT_INPUT_ENTERPRISE_PLCHOLDER_PHONE, MAT_LABEL_INPUT_ENTERPRISE_DESC, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_ADDRESS, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CITY, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CODEPOST, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_DEVISE, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_GOV, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_MF, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_POSITION, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_NAME, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_SURNAME, MAT_LABEL_INPUT_ENTERPRISE_FIX_PHONE, MAT_LABEL_INPUT_ENTERPRISE_MAIL, MAT_LABEL_INPUT_ENTERPRISE_MOBILE_1, MAT_LABEL_INPUT_ENTERPRISE_MOBILE_2, MAT_LABEL_INPUT_ENTERPRISE_NAME, MAT_TAB_LABEL_ENTERPRISE, MAT_TAB_LABEL_PARAMS, MAT_TAB_LABEL_SETTINGS } from '../shared/constants/components/config';
import { MatDialog } from '@angular/material/dialog';
import { AddSalesSiteModalComponent } from '../dashboard/modals/add-sales-site-modal/add-sales-site-modal.component';
import { ABORT_BUTTON, ADD_BUTTON } from '../shared/Text_Buttons';
import { DEVISES, GOV_TN, JOB_DESCRIPTION } from '../shared/constants/modals/sales_site_modal';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ROLE_TRANSLATIONS, Roles } from '../models/components/appuser';
import { MatTableDataSource } from '@angular/material/table';
import { Site } from '../models/components/sites';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { EnterpriseService } from '../services/components/enterprise.service';
import { AppUserEnterprise, Enterprise } from '../models/components/enterprise';
import { ToastrService } from 'ngx-toastr';



@Component({
  selector: 'app-enterprise',
  templateUrl: './enterprise.component.html',
  styleUrl: './enterprise.component.css'
})
export class EnterpriseComponent implements OnInit {

  dialog = inject(MatDialog);
  fb = inject(FormBuilder);
  router = inject(Router);
  cdr = inject(ChangeDetectorRef);
  enterpriseService = inject(EnterpriseService);
  toastr = inject(ToastrService);

  //#region Labels
  mat_tab_label_params: string = MAT_TAB_LABEL_PARAMS;
  mat_tab_label_enterprise: string = MAT_TAB_LABEL_ENTERPRISE;
  mat_card_header_enterprise: string = MAT_CARD_HEADER_ENTERPRISE;

  mat_label_input_enterprise_name: string = MAT_LABEL_INPUT_ENTERPRISE_NAME;
  mat_label_input_enterprise_desc: string = MAT_LABEL_INPUT_ENTERPRISE_DESC;
  mat_label_input_enterprise_mail: string = MAT_LABEL_INPUT_ENTERPRISE_MAIL;
  mat_label_input_enterprise_fix_phone: string = MAT_LABEL_INPUT_ENTERPRISE_FIX_PHONE;
  mat_label_input_enterprise_mobile_1: string = MAT_LABEL_INPUT_ENTERPRISE_MOBILE_1;
  mat_label_input_enterprise_mobile_2: string = MAT_LABEL_INPUT_ENTERPRISE_MOBILE_2;

  mat_input_enterprise_placeholder_name: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_NAME;
  mat_input_enterprise_placeholder_desc: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_DESC;
  mat_input_enterprise_placeholder_email: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_EMAIL;
  mat_input_enterprise_placeholder_phone: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_PHONE;
  mat_input_enterprise_placeholder_mobile1: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_1;
  mat_input_enterprise_placeholder_mobile2: string = MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_2;

  mat_card_header_details: string = MAT_CARD_HEADER_DETAILS;

  mat_label_input_enterprise_details_mf: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_MF;
  mat_label_input_enterprise_details_devise: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_DEVISE;
  mat_label_input_enterprise_details_resp_name: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_NAME;
  mat_label_input_enterprise_details_resp_surname: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_SURNAME;
  mat_label_input_enterprise_details_position: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_POSITION;
  mat_label_input_enterprise_details_address: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_ADDRESS;
  mat_label_input_enterprise_details_city: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CITY;
  mat_label_input_enterprise_details_gov: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_GOV;
  mat_label_input_enterprise_details_codepost: string = MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CODEPOST;

  mat_input_enterprise_details_placeholder_mf: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_MF;
  mat_input_enterprise_details_placeholder_devise: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_DEVISE;
  mat_input_enterprise_details_placeholder_resp_name: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_NAME;
  mat_input_enterprise_details_placeholder_resp_surname: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_SURNAME;
  mat_input_enterprise_details_placeholder_position: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_POSITION;
  mat_input_enterprise_details_placeholder_address: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_ADRESSE;
  mat_input_enterprise_details_placeholder_city: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CITY;
  mat_input_enterprise_details_placeholder_codepost: string = MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CODEPOST;

  ask_for_wood_selling: string = ASK_FOR_WOOD_SELLEING;

  // CARD ENTERPRiSE SITES
  mat_card_header_enter_sites: string = MAT_CARD_HEADER_ENTER_SITES;

  // TAB SETTINGS
  // CARD CATEGORY
  mat_tab_label_settings: string = MAT_TAB_LABEL_SETTINGS;

  mat_card_settings_config: string = MAT_CARD_SETTINGS_CONFIG;

  abort_button_label: string = ABORT_BUTTON;

  //#endregion

  enterpriseForm!: FormGroup;
  allSitesForm!: FormGroup;
  loading: boolean = false;

  allSites: MatTableDataSource<Site> = new MatTableDataSource<Site>();
  displayedSitesColumns: string[] = ['number', 'address', '_gov', 'isForsale', 'action'];

  passwordHide: boolean = true;
  confirmHide: boolean = true;
  add_button: string = ADD_BUTTON;
  govOptions = GOV_TN;
  devisesOptions = Object(DEVISES);
  jobDescOptions = Object(JOB_DESCRIPTION);

  roles = Object.entries(Roles)
    .filter(([key, value]) => !isNaN(Number(value)) && value !== Roles.SuperAdmin) // Exclude reverse mappings and SuperAdmin
    .map(([key, value]) => ({ key: Number(value), value: ROLE_TRANSLATIONS[Number(value)] || key }));


  ngOnInit(): void {
    this.createForm();
    this.createSiteForm();
    this.roles = this.getUserRoles();
  }

  createSiteForm() {
    this.allSitesForm = this.fb.group({
      number: [''],
      address: [''],
      _gov: [''],
      isForsale: ['']
    })
  }

  createForm() {
    this.enterpriseForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      email: ['', Validators.email],
      phone: [''],
      mobileOne: ['', Validators.required],
      mobileTwo: [''],
      matriculeFiscal: ['', Validators.required],
      devise: [this.devisesOptions[0].key, Validators.maxLength(4)],
      nameResponsable: ['', Validators.required],
      surnameResponsable: ['', Validators.required],
      positionResponsable: [this.jobDescOptions[3].key, Validators.required],
      siegeAddress: ['', Validators.required],
      emailappuser: ['', Validators.required],
      passwordappuser: ['', Validators.required],
      confirmpasswordappuser: ['', Validators.required],
      appusername: ['', Validators.required],
      appusersurname: ['', Validators.required],
      selectedRole: [this.roles[0].key, Validators.required],
      commercialregister: ['', Validators.required],
      capital: ['', Validators.required],
      iswoodselling: [true]
    },
      {
        validator: this.passwordMatchValidator,
      });
  }

  abort() {
    this.enterpriseForm.reset();
    this.allSitesForm.reset();
    this.router.navigate(['/']);
  }

  delete(index: number): void {
    const currentData = this.allSites.data;
    currentData.splice(index, 1);  // Remove the element at the specified index
    this.allSites.data = [...currentData];  // Refresh the data source

    // Manually trigger change detection to update the row numbers
    this.cdr.detectChanges();
  }


  //#region Sales Sites Methods
  openAddSalesSiteDialog(): void {
    const dialogRef = this.dialog.open(AddSalesSiteModalComponent, {
      width: '1000px',
      maxWidth: '90vw',
      maxHeight: '150vh',
      data: {
        input: 'first-creation'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) { // Check if result is not undefined or null
        console.log("RESULT : ", result);
        let _k = result.gov;
        result.gov = this.getGouvernoratById(_k);
        this.allSites.data = [...this.allSites.data, result];

        console.log("Updated Table Data: ", this.allSites.data);

        // Trigger change detection manually
        this.cdr.detectChanges();
      }
    });
  }

  onToggleChange(event: MatSlideToggleChange, element: any): void {
    element.isForsale = event.checked;
  }

  /**
   * 
   * @param _key the selected gouvernorate key
   * @returns the string of the created gouvernorate
   */
  private getGouvernoratById(_key: number): string {
    const gov = this.govOptions.find(g => g.key === _key);
    return gov ? gov.value : 'Unknown';
  }

  private getDeviseValueByKey(_key: number): string {
    const devis = this.devisesOptions.find((d: { key: number; value: string }) => d.key === _key);
    return devis ? devis.value : 'Unknown';
  }

  private getPositionValueByKey(_key: number): string {
    const _job = this.jobDescOptions.find((job: { key: number; value: string }) => job.key === _key);
    return _job ? _job.value : 'Unknown';
  }

  private getUserRoles(): Array<{ key: number, value: string }> {
    return Object.entries(Roles)
      .filter(([key, value]) =>
        !isNaN(Number(value)) &&
        [Roles.Admin].includes(Number(value)) &&
        value !== Roles.SuperAdmin // Exclude SuperAdmin
      )
      .map(([key, value]) => ({ key: Number(value), value: ROLE_TRANSLATIONS[Number(value)] || key }));
  }

  createEnterpriseInstance(): Enterprise | null {
    if (!this.enterpriseForm.valid) return null;

    const sites = this.createSitesEnterpriseInstance();
    if (!sites || sites.length == 0) {
      this.toastr.info("Ajouter au moins un site de Vente");
      return null;
    }

    const formValues = this.enterpriseForm.value;
    const ent = new Enterprise();

    // Populate Enterprise properties
    ent.id = 0; // Set initial ID to 0, or adjust as needed
    ent.name = formValues.name;
    ent.description = formValues.description;
    ent.email = formValues.email;
    ent.matriculeFiscal = formValues.matriculeFiscal;
    ent.phone = formValues.phone;
    ent.mobileOne = formValues.mobileOne;
    ent.mobileTwo = formValues.mobileTwo;
    ent.devise = this.getDeviseValueByKey(formValues.devise);
    ent.nameResponsable = formValues.nameResponsable;
    ent.surnameResponsable = formValues.surnameResponsable;
    ent.positionResponsable = this.getPositionValueByKey(formValues.positionResponsable);
    ent.siegeAddress = formValues.siegeAddress;
    ent.capital = formValues.capital;
    ent.commercialregister = formValues.commercialregister;
    ent.issalingwood = formValues.iswoodselling;

    // App User Information in Enterprise Creation
    ent.user = this.createUserEnterpriseInstance(formValues);

    // Sites Information in Enterprise Creation
    // ent.sites = this.createSitesEnterpriseInstance();
    ent.sites = sites;

    return ent;
  }

  createUserEnterpriseInstance(formValues: any): AppUserEnterprise {
    return {
      name: formValues.appusername,
      surname: formValues.appusersurname,
      email: formValues.emailappuser,
      password: formValues.passwordappuser,
      role: formValues.selectedRole.toString()
    };
  }

  createSitesEnterpriseInstance(): Site[] | null {
    if (!this.allSitesForm.valid) return null;

    const sitesValues = this.allSites.data;

    console.log("FormValues", sitesValues);
    const sites: Site[] = [];

    sitesValues.forEach((element: Site) => {
      const site = new Site();
      site.id = 0;
      site.codepost = element.codepost;
      site.gov = element.gov;
      site.address = element.address;
      site.isForsale = element.isForsale;

      sites.push(site);
    });
    return sites;
  }

  register() {
    this.loading = true;
    let _ent = this.createEnterpriseInstance();
    console.log("FORM VALUES ENTERPRISE BEFORE REGISTER : ", _ent);
    if (_ent != null) {
      this.enterpriseService.Register(_ent).subscribe({
        next: (response) => {
          console.log(response);
          this.toastr.success("Succés de la création de l'Entreprsie.");
          this.toastr.info("Vous receverez votre Identifiant par mail.");
          this.toastr.show("Bon Travail.");
          this.router.navigate(['/login']);
          this.loading = false;
        }, error: (error) => {
          console.error('Error creating enterprise', error);
          this.toastr.error("Impossible de se Connecter au Serveur, Réessayer plus tard");
          this.loading = false;
        }
      });
    } else {
      this.toastr.error("Vérifier les chanps d'abord");
      this.loading = false;
    }
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const password = control.get('passwordappuser')?.value;
    const confirPassword = control.get('confirmpasswordappuser')?.value;

    if (password !== confirPassword) {
      return { passwordMisMatch: true };
    }
    return null;
  }

}
