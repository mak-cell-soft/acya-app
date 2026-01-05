import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GENERAL_INFORMATION_PROVIDER } from '../../../shared/constants/components/article';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { validateHeaderName } from 'node:http';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { fiscalMatriculeValidator } from '../../../shared/validators/taxRegistrationValidator';
import { ToastrService } from 'ngx-toastr';
import { ProviderService } from '../../../services/components/provider.service';
import { Router } from '@angular/router';
import { CounterPartType_FR, Prefix, SupplierCategories_FR, SocietyPrefixes_FR } from '../../../shared/constants/list_of_constants';
import { Provider } from '../../../models/components/provider';
import { CounterPart } from '../../../models/components/counterpart';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { Transporter, Vehicle } from '../../../models/components/customer';
import { AppUser } from '../../../models/components/appuser';

export interface _Transporter {
  transpSurname: string;
  transpName: string;
  vehiculematricule: string;
}


@Component({
  selector: 'app-add-provider',
  templateUrl: './add-provider.component.html',
  styleUrl: './add-provider.component.css'
})
export class AddProviderComponent implements OnInit {

  counterPartService = inject(CounterpartService);
  fb = inject(FormBuilder);
  toastr = inject(ToastrService);
  router = inject(Router);
  authService = inject(AuthenticationService);

  //#region Labels and Informations
  general_information_provider: string = GENERAL_INFORMATION_PROVIDER;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  //#endregion

  supplierForm!: FormGroup;
  allPrefixes = Object.values(SocietyPrefixes_FR);
  allProvidersCategories = Object.values(SupplierCategories_FR);
  allBanks = Object.values(BANKS_TN);
  userconnected = this.authService.getUserDetail();
  transporters: _Transporter[] = [];

  constructor() { }

  ngOnInit(): void {
    this.createForm()
  }

  createForm() {
    this.supplierForm = this.fb.group({
      prefix: [this.allPrefixes[0].id, Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      category: [this.allProvidersCategories[1].id, Validators.required],
      phoneOne: ['', Validators.required],
      phoneTwo: [''],
      taxRegistration: ['', [Validators.required, fiscalMatriculeValidator()]], // Apply the custom validator here
      email: ['', Validators.email],
      representedByName: ['', Validators.required],
      representedBySurname: ['', Validators.required],
      bank: ['', Validators.required],
      bankAccountNumber: ['', Validators.required],
      isTypeBoth: ['']
    });
  }

  getKeyByValue(value: string): string {
    const entry = Object.entries(Prefix).find(([key, val]) => val === value);
    return entry ? entry[0] : '';
  }

  onSubmit() {
    const supplier = this.createCounterPartInstance(this.supplierForm);
    this.addSupplier(supplier!);
  }

  createCounterPartInstance(formValues: any): CounterPart | null {
    let transporter: any;
    if (this.transporters.length > 0) {
      const firstTransporter = this.transporters[0];

      // Create a new Transporter instance
      transporter = new Transporter(
        0,                               // id
        firstTransporter.transpName,      // firstname
        firstTransporter.transpSurname,   // lastname
        `${firstTransporter.transpSurname} ${firstTransporter.transpName}`, // fullname
        new Vehicle(firstTransporter.vehiculematricule) // car
      );
    } else {
      transporter = null;
    }
    if (this.supplierForm.valid) {
      formValues = this.supplierForm.value;
      return {
        id: 0, // Id will be generated in the back-end
        prefix: formValues.prefix,
        guid: '',
        type: formValues.isTypeBoth ? CounterPartType_FR.both : CounterPartType_FR.supplier,
        name: formValues.name,
        description: formValues.description,
        phonenumberone: formValues.phoneOne,
        phonenumbertwo: formValues.phoneTwo,
        taxregistrationnumber: formValues.taxRegistration,
        patentecode: '',
        identitycardnumber: '',
        email: formValues.email,
        lastname: formValues.representedByName,
        firstname: formValues.representedBySurname,
        maximumdiscount: 0,
        maximumsalesbar: 0,
        notes: formValues.notes,
        gouvernorate: '',
        bankname: formValues.bank,
        bankaccountnumber: formValues.bankAccountNumber,
        address: formValues.address,
        jobtitle: formValues.category.toString(),
        creationdate: new Date(),
        updatedate: new Date(),
        isactive: true,
        isdeleted: false,

        updatedbyid: Number(this.userconnected?.id),
        appuser: new AppUser(),
        transporter: transporter,
        editing: false,
        isTypeBoth: formValues.isTypeBoth
      }
    } else {
      this.toastr.warning("Valider les champs de saisie d\'abord !");
    }
    return null;
  }

  addSupplier(supplier: CounterPart): void {
    if (supplier) {
      console.log("Provider TO SEND : ", supplier);
      this.counterPartService.Add(supplier).subscribe({
        next: (response) => {
          this.toastr.success('Successfully added provider: ' + response.name);
          this.router.navigateByUrl('home/providers');
        },
        error: (error) => {
          if (error.status === 409) {
            // Conflict Error: Article already exists
            this.toastr.error('Un Fournisseur du même nom existe déjà.');
          } else if (error.status === 400) {
            // Bad Request: General failure when adding the article
            this.toastr.error('Error: Failed to add the article.');
          } else if (error.status === 404) {
            // Not Found: Failure to add price history
            this.toastr.error('Error: Failed to add sell price history.');
          } else {
            // Generic error handler for other cases
            this.toastr.error('An unexpected error occurred. Please try again later.');
          }

          // Log the error for debugging
          console.error('Error adding Article', error);
        }
      });
    } else {
      this.toastr.warning('Warning: Article is missing.');
    }
  }
}
