import { Component, inject, OnInit } from '@angular/core';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { GENERAL_INFORMATION_CUSTOMERR } from '../../../shared/constants/components/article';
import { ABORT_BUTTON, REGISTER_BUTTON } from '../../../shared/Text_Buttons';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { atLeastOneRequiredValidator, numericValidator, uppercaseAlphanumericValidator } from '../../../shared/validators/atLeastOneRequiredValidator';
import { GOV_TN } from '../../../shared/constants/modals/sales_site_modal';
import { MatDialog } from '@angular/material/dialog';
import { AddTransporterModalComponent } from '../../../dashboard/modals/add-transporter-modal/add-transporter-modal.component';
import { CounterPart } from '../../../models/components/counterpart';
import { AppUser } from '../../../models/components/appuser';
import { Transporter, Vehicle } from '../../../models/components/customer';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { ToastrService } from 'ngx-toastr';
import { CounterPartType_FR, CustomerPrefixes_FR, Prefix, ProviderCategories, SupplierCategories_FR, CounterPartActivities_FR, SocietyPrefixes_FR } from '../../../shared/constants/list_of_constants';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { error } from 'console';
import { Router } from '@angular/router';


export interface _Transporter {
  transpSurname: string;
  transpName: string;
  vehiculematricule: string;
}

@Component({
  selector: 'app-add-customer',
  templateUrl: './add-customer.component.html',
  styleUrl: './add-customer.component.css'
})

export class AddCustomerComponent implements OnInit {

  //TODO : Corriger l'Ajout d'un client avec Transporteur
  // TODO : Vérifeir les méthodes de contrôle de saisie.

  fb = inject(FormBuilder);
  fb1 = inject(FormBuilder);
  dialog = inject(MatDialog);
  counterPartService = inject(CounterpartService);
  router = inject(Router);
  toastr = inject(ToastrService);
  authService = inject(AuthenticationService);
  //#region Labels and Informations
  general_information_customer: string = GENERAL_INFORMATION_CUSTOMERR;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  //#endregion

  customerForm!: FormGroup;
  societyForm!: FormGroup;

  OneTransporterForm!: FormGroup;
  displayedTransporterColumns: string[] = ['number', 'surname', 'name', 'vehiculematricule', 'action'];

  transporters: _Transporter[] = [];


  allPrefixes = Object.values(Prefix);
  allProvidersCategories = Object.values(SupplierCategories_FR);
  allBanks = Object.values(BANKS_TN)
  societyPrefixes = Object.values(SocietyPrefixes_FR);
  customerPrefixes = Object.values(CustomerPrefixes_FR);
  societyActivities = Object.values(CounterPartActivities_FR);
  gouvernorate = Object.values(GOV_TN);
  userconnected = this.authService.getUserDetail();

  constructor() { }

  ngOnInit(): void {
    this.createSocietyForm();
    this.createCustomerForm();
  }

  createSocietyForm() {
    this.societyForm = this.fb.group({
      selectedprefix: [this.societyPrefixes[0].id, Validators.required || null],
      name: ['', Validators.required],
      description: ['', Validators.required],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      activity: [this.societyActivities[0].key, Validators.required || null],
      email: ['', Validators.email],
      phonenumberone: ['', [Validators.required, numericValidator()]],
      phonenumbertwo: ['', numericValidator()],
      // mfcode: ['', [uppercaseAlphanumericValidator()]],
      // patentecode: ['', [uppercaseAlphanumericValidator()]],
      mfcode: [''],
      patentecode: [''],
      maximumdiscount: [''],
      maximumsalesbar: [''],
      address: [''],
      gouvernorate: [this.gouvernorate[0].key, Validators.required || null],
      bank: [''],
      bankaccount: [''],
      notes: [''],
      openingbalance: [0],
      isTypeBoth: ['']
    },
      //{ validators: atLeastOneRequiredValidator('mfcode', 'patentecode') } // Apply Society validator here
    );
  }

  createCustomerForm() {
    this.customerForm = this.fb1.group(
      {
        selectedprefix: [this.customerPrefixes?.[0]?.id || null],
        lastname: ['', Validators.required],
        firstname: ['', Validators.required],
        cin: ['', [Validators.required, numericValidator()]],
        email: ['', [Validators.email]],
        phonenumberone: ['', [Validators.required, numericValidator()]],
        phonenumbertwo: ['', numericValidator()],
        activity: [this.societyActivities?.[1]?.key || null, Validators.required],
        notes: [''],
        // mfcode: ['', [uppercaseAlphanumericValidator()]],
        // patentecode: ['', [uppercaseAlphanumericValidator()]],
        mfcode: [''],
        patentecode: [''],
        maximumdiscount: [''],
        maximumsalesbar: [''],
        bank: [''],
        bankaccount: [''],
        address: ['', Validators.required],
        gouvernorate: [this.gouvernorate?.[0]?.key || null],
        openingbalance: [0],
        isTypeBoth: ['']
      },
      { validators: atLeastOneRequiredValidator('cin', 'mfcode', 'patentecode') }
    );
  }

  onSubmit(counterPartForm: FormGroup) {
    // if (counterPartForm.invalid) {
    //   this.toastr.warning("Veuillez remplir tous les champs obligatoires.");
    //   return;
    // }

    const counterpart = this.createCounterPartInstance(counterPartForm);
    console.log('CounterPart to submit:', counterpart);

    if (counterpart != null) {
      this.counterPartService.Add(counterpart).subscribe({
        next: (response) => {
          console.log('Added CounterPart:', response);
          this.toastr.success('Client ajouté avec Succés');
          this.router.navigateByUrl('home/customers');
        },
        error: (error) => {
          console.error('Error adding CounterPart:', error);
          this.toastr.error('Erreur lors de l\'ajout du client');
        }
      });
    } else {
      this.toastr.warning("Error creating the client. Please try again later.");
    }
  }


  createCounterPartInstance(form: FormGroup): CounterPart | null {
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

    const formValues = form.value;

    if (form === this.customerForm) {
      /**
       * Add Counter Part as Customer
       */
      return {
        id: 0,
        guid: '',
        type: formValues.isTypeBoth ? CounterPartType_FR.both : CounterPartType_FR.customer,
        prefix: formValues.selectedprefix,
        name: '',
        description: '',
        firstname: formValues.firstname,
        lastname: formValues.lastname,
        identitycardnumber: formValues.cin,
        email: formValues.email,
        taxregistrationnumber: formValues.mfcode,
        patentecode: formValues.patentecode,
        address: formValues.address,
        gouvernorate: formValues.gouvernorate?.toString() || '',
        maximumdiscount: Number(formValues.maximumdiscount) || 0,
        maximumsalesbar: Number(formValues.maximumsalesbar) || 0,
        notes: formValues.notes,
        phonenumberone: formValues.phonenumberone,
        phonenumbertwo: formValues.phonenumbertwo,
        creationdate: new Date(),
        updatedate: new Date(),
        jobtitle: formValues.activity?.toString() || '',
        bankname: formValues.bank,
        bankaccountnumber: formValues.bankaccount,
        isactive: true,
        isdeleted: false,
        openingbalance: Number(formValues.openingbalance) || 0,

        updatedbyid: Number(this.userconnected?.id),
        appuser: new AppUser(),
        transporter: transporter,
        editing: false,
        isTypeBoth: formValues.isTypeBoth
      };

    } else if (form === this.societyForm) {
      /**
       * Add Counter Part as Society
       */
      return {
        id: 0,
        guid: '',
        type: formValues.isTypeBoth ? CounterPartType_FR.both : CounterPartType_FR.customer,
        prefix: formValues.selectedprefix,
        name: formValues.name,
        description: formValues.description,
        firstname: formValues.firstname,
        lastname: formValues.lastname,
        identitycardnumber: '',
        email: formValues.email,
        taxregistrationnumber: formValues.mfcode,
        patentecode: formValues.patentecode,
        address: formValues.address,
        gouvernorate: formValues.gouvernorate?.toString() || '',
        maximumdiscount: Number(formValues.maximumdiscount) || 0,
        maximumsalesbar: Number(formValues.maximumsalesbar) || 0,
        notes: formValues.notes,
        phonenumberone: formValues.phonenumberone,
        phonenumbertwo: formValues.phonenumbertwo,
        creationdate: new Date(),
        updatedate: new Date(),
        jobtitle: formValues.activity?.toString() || '',
        bankname: formValues.bank,
        bankaccountnumber: formValues.bankaccount,
        isactive: true,
        isdeleted: false,
        openingbalance: Number(formValues.openingbalance) || 0,

        updatedbyid: Number(this.userconnected?.id),
        appuser: new AppUser(),
        transporter: transporter,
        editing: false,
        isTypeBoth: formValues.isTypeBoth
      };
    }
    return null;
  }

  openCreateTransporterModal() {
    const dialogRef = this.dialog.open(AddTransporterModalComponent, {
      width: '950px',
      height: '400px',
      maxWidth: '90vw',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("Transporter ADD", result);

        // Create a new instance of `_Transporter` and map values
        const newTransporter = ({
          transpSurname: result.firstname,
          transpName: result.lastname,
          vehiculematricule: result.car.serialnumber,
        });

        // Add the new transporter to the table's data
        this.transporters = [...this.transporters, newTransporter];
      }
    });

  }

  delete(index: number) {
    this.transporters.splice(index, 1); // Remove transporter by index
  }

  onUpperCase(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.customerForm.get(controlName)?.setValue(input.value);
  }

}
