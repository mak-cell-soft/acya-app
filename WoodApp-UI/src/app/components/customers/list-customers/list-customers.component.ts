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
import { CustomerDetailsModalComponent } from '../customer-details-modal/customer-details-modal.component';
import { CustomerEditModalComponent } from '../customer-edit-modal/customer-edit-modal.component';
import { CustomerAccountModalComponent } from '../customer-account-modal/customer-account-modal.component';

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
  displayedColumns: string[] = ['fullname', 'type', 'address', 'mfcode', 'cin', 'updatedate', 'mobileone', 'action'];

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

  onDetail(customer: CounterPart): void {
    this.dialog.open(CustomerDetailsModalComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: { customer }
    });
  }

  onEdit(customer: CounterPart): void {
    const dialogRef = this.dialog.open(CustomerEditModalComponent, {
      width: '900px',
      maxWidth: '90vw',
      data: { customer }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.getCustomers();
      }
    });
  }

  onShowAccount(customer: CounterPart): void {
    this.dialog.open(CustomerAccountModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      data: { customer }
    });
  }

  onReturn(): void {
    this.router.navigate(['/dashboard']);
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
