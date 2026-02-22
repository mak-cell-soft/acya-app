import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { ToastrService } from 'ngx-toastr';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { CounterPart } from '../../../models/components/counterpart';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { CounterPartActivities_FR, CounterPartType_FR, CustomerPrefixes_FR, fullPrefixes_FR, SocietyPrefixes_FR } from '../../../shared/constants/list_of_constants';
import { UPDATE_BUTTON } from '../../../shared/Text_Buttons';
import { GOV_TN } from '../../../shared/constants/modals/sales_site_modal';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { Router } from '@angular/router';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { CustomerBatchConversionModalComponent } from '../../merchandise/customer/list-customer-documents/customer-batch-conversion-modal/customer-batch-conversion-modal.component';

export enum CounterPartType {
  customer = 'Client Régulier',
  supplier = 'Fournisseur',
  both = 'Client/Fournisseur'
}

@Component({
  selector: 'app-list-customers',
  templateUrl: './list-customers.component.html',
  styleUrl: './list-customers.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ]
})
export class ListCustomersComponent implements OnInit {

  toastr = inject(ToastrService);
  fb = inject(FormBuilder);
  counterPartService = inject(CounterpartService);
  authService = inject(AuthenticationService);
  router = inject(Router);
  dialog = inject(MatDialog);

  allCustomers: MatTableDataSource<CounterPart> = new MatTableDataSource<CounterPart>();
  displayedProvidersColumns: string[] = ['fullname', 'type', 'address', 'mfcode', 'cin', 'updatedate', 'mobileone', 'action'];


  columnsToDisplayWithExpand = [...this.displayedProvidersColumns, 'expand'];
  expandedElement: CounterPart | null = null;

  loading: boolean = false; // Track loading state
  selectedCustomer!: CounterPart | null;
  selectedCustomerForm!: FormGroup;
  allPrefixes = Object.values(fullPrefixes_FR);
  societyActivities = Object.values(CounterPartActivities_FR);
  gouvernorate = Object.values(GOV_TN);
  allBanks = Object.values(BANKS_TN)
  isSociety: boolean = false;

  update_button: string = UPDATE_BUTTON;

  @ViewChild(MatPaginator) PaginationCustomer!: MatPaginator;
  @ViewChild(MatSort) sortCustomers!: MatSort;

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getCustomers();
      this.allCustomers.paginator = this.PaginationCustomer;
      this.allCustomers.sort = this.sortCustomers;
    } else {
      this.toastr.error('Vous devez vous connecter pour accéder à cette page');
      this.router.navigateByUrl('/login');
    }

  }

  getCustomers() {
    this.counterPartService.GetAll(CounterPartType_FR.customer).subscribe(
      {
        next: (response) => {
          console.log('Liste de tous les clients', response)
          this.allCustomers.data = response;
        }, error: (error) => {
          console.error(error);
        }
      }
    );
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allCustomers.filter = filterValue.trim().toLowerCase();

    if (this.PaginationCustomer) {
      this.PaginationCustomer.firstPage();
    }
  }

  cancelEditCustomer(element: CounterPart) {
    element.editing = false;
    this.isSociety = false;
    this.selectedCustomer = null;
  }

  deleteCustomer(element: CounterPart) {
    this.counterPartService.Delete(element.id).subscribe({
      next: () => {
        this.allCustomers.data = this.allCustomers.data.filter(p => p.id !== element.id);
        this.toastr.success('Provider deleted successfully');
      },
      error: () => this.toastr.error('Error deleting Provider')
    });
  }

  //#region  Edit Customer
  // editCustomer(customer: CounterPart) {
  //   customer.editing = true;
  //   console.log('IS SOCIETY BOOLEAN : ', this.isSociety);
  //   /**
  //    * Test if the customer is already a Customer
  //    */
  //   if (this.isPrefixValid(customer.prefix)) {
  //     this.selectedCustomer = customer;
  //     this.isSociety = false;
  //     this.createCustomerForm();
  //     this.customerPatchValues(this.selectedCustomer);
  //   }
  //   /**
  //    * Else the Customer is a Society  
  //    */
  //   else {
  //     this.selectedCustomer = customer;
  //     this.isSociety = true;
  //     console.log('IS SOCIETY BOOLEAN : ', this.isSociety);
  //     this.createSocietyForm();
  //     this.societyPatchValues(this.selectedCustomer);
  //   }
  // }
  editCustomer(customer: CounterPart) {
    customer.editing = true;
    this.selectedCustomer = customer;

    // Loop through all Customers and set editing to false except for the selected one
    this.allCustomers.data.forEach(_customer => {
      _customer.editing = (_customer.id === customer.id); // Only the selected customer will have editing = true
    });

    // Determine if the customer is a society
    this.isSociety = this.isPrefixValid(customer.prefix);
    console.log("Is SOCIETY :", this.isSociety);

    // Dynamically create the form
    if (this.isSocietyPrefix(customer.prefix)) {
      this.createSocietyForm();
      this.societyPatchValues(this.selectedCustomer);
    } else {
      this.isSociety = false;
      this.createCustomerForm();
      this.customerPatchValues(this.selectedCustomer);
    }
  }

  isPrefixValid(prefix: string): boolean {
    const isInSocietyPrefixes = SocietyPrefixes_FR.some(item => item.id === prefix);
    const isInCustomerPrefixes = CustomerPrefixes_FR.some(item => item.id === prefix);
    return isInSocietyPrefixes || isInCustomerPrefixes;
  }

  isSocietyPrefix(prefix: string): boolean {
    return SocietyPrefixes_FR.some(item => item.id === prefix);
  }

  //#endregion

  //#region Society Form
  societyPatchValues(customer: CounterPart) {
    this.selectedCustomerForm.patchValue({
      selectedprefix: customer.prefix,
      type: customer.type,
      name: customer.name,
      description: customer.description,
      firstname: customer.firstname,
      lastname: customer.lastname,
      phonenumberone: customer.phonenumberone,
      phonenumbertwo: customer.phonenumbertwo,
      maximumdiscount: customer.maximumdiscount,
      maximumsalesbar: customer.maximumsalesbar,
      cin: customer.identitycardnumber,
      mfcode: customer.taxregistrationnumber,
      patentecode: customer.patentecode,
      activity: Number(customer.jobtitle),
      email: customer.email,
      gouvernorate: Number(customer.gouvernorate),
      bank: customer.bankname,
      notes: customer.notes,
      bankaccount: customer.bankaccountnumber,
      address: customer.address,
      istypeboth: customer.type == CounterPartType_FR.both ? true : false
    });
  }

  createSocietyForm() {
    this.selectedCustomerForm = this.fb.group({
      selectedprefix: [this.selectedCustomer?.prefix || '', Validators.required],
      firstname: [this.selectedCustomer?.firstname || '', Validators.required],
      lastname: [this.selectedCustomer?.lastname || '', Validators.required],
      name: [this.selectedCustomer?.name || '', Validators.required],
      description: [this.selectedCustomer?.description || '', Validators.required],
      type: [''],
      // firstname: [''],
      // lastname: [''],
      // name: [''],
      // description: [''],
      phonenumberone: [''],
      phonenumbertwo: [''],
      maximumdiscount: [''],
      maximumsalesbar: [''],
      address: [''],
      gouvernorate: [''],
      cin: [''],
      mfcode: [''],
      patentecode: [''],
      activity: [''],
      email: [''],
      bank: [''],
      bankaccount: [''],
      notes: [''],
      istypeboth: ['']
    });
  }
  //#endregion

  //#region Customer Form
  customerPatchValues(customer: CounterPart) {
    this.selectedCustomerForm.patchValue({
      selectedprefix: customer.prefix,
      type: customer.type,
      name: customer.name,
      description: customer.description,
      firstname: customer.firstname,
      lastname: customer.lastname,
      phonenumberone: customer.phonenumberone,
      phonenumbertwo: customer.phonenumbertwo,
      maximumdiscount: customer.maximumdiscount,
      maximumsalesbar: customer.maximumsalesbar,
      cin: customer.identitycardnumber,
      mfcode: customer.taxregistrationnumber,
      patentecode: customer.patentecode,
      activity: Number(customer.jobtitle),
      email: customer.email,
      gouvernorate: Number(customer.gouvernorate),
      bank: customer.bankname,
      notes: customer.notes,
      bankaccount: customer.bankaccountnumber,
      address: customer.address,
      istypeboth: false
    });
  }

  createCustomerForm() {
    this.selectedCustomerForm = this.fb.group({
      selectedprefix: [this.selectedCustomer?.prefix || '', Validators.required],
      firstname: [this.selectedCustomer?.firstname || '', Validators.required],
      lastname: [this.selectedCustomer?.lastname || '', Validators.required],
      type: [''],
      //firstname: [''],
      //lastname: [''],
      name: [],
      description: [''],
      phonenumberone: [''],
      phonenumbertwo: [''],
      maximumdiscount: [''],
      maximumsalesbar: [''],
      address: [''],
      gouvernorate: [''],
      cin: [''],
      mfcode: [''],
      patentecode: [''],
      activity: [''],
      email: [''],
      bank: [''],
      bankaccount: [''],
      notes: [''],
      istypeboth: ['']
    });
  }
  //#endregion

  saveEditedCustomer() {
    // this.selectedCustomerForm.valueChanges.subscribe((value) => {
    //   this.selectedCustomer = value;
    // });
    this.selectedCustomerForm.reset();
    this.getCustomers();
    this.toastr.success('Client modifié avec succès');
  }

  getCounterPartType(type: string): string {
    const mapping: { [key: string]: CounterPartType } = {
      Customer: CounterPartType.customer,
      Supplier: CounterPartType.supplier,
      Both: CounterPartType.both
    };
    return mapping[type] || '** Non Connue **';
  }

  getCounterPartJobTitleValue(_k: string): string {
    const key = Number(_k); // Convert the key from string to number
    // Create a mapping from the array for quick lookup
    const mapping = CounterPartActivities_FR.reduce(
      (acc, activity) => ({ ...acc, [activity.key]: activity.value }),
      {} as { [key: number]: string }
    );
    return mapping[key] || '** Non Connue **'; // Fallback to 'Unknown' if key not found
  }

  onUpperCase(event: Event, controlName: string): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.toUpperCase();
    this.selectedCustomerForm.get(controlName)?.setValue(input.value);
  }

  // getKeyfromJobTitle(activity: string): number | undefined {
  //   const _job = this.societyActivities.find(activ => activ.value === activity);
  //   return _job ? _job.key : undefined;
  // }

  getFullName(element: any): string {
    if (element.prefix === 'MRS' || element.prefix === 'MME') {
      return `${element.prefix} - ${element.firstname} ${element.lastname}`;
    }
    return `${element.prefix} - ${element.name}`;
  }

  onBatchConvertForCustomer(): void {
    const dialogRef = this.dialog.open(CustomerBatchConversionModalComponent, {
      width: '95vw',
      maxWidth: '1600px',
      maxHeight: '95vh',
      disableClose: true,
      panelClass: 'full-screen-modal'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.getCustomers();
      }
    });
  }

}
