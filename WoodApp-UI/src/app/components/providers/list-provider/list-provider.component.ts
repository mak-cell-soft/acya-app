import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ProviderService } from '../../../services/components/provider.service';
import { ToastrService } from 'ngx-toastr';
import { GENERAL_INFORMATION_PROVIDER } from '../../../shared/constants/components/article';
import { ABORT_BUTTON, REGISTER_BUTTON, UPDATE_BUTTON } from '../../../shared/Text_Buttons';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { fiscalMatriculeValidator } from '../../../shared/validators/taxRegistrationValidator';
import { CounterPartType_FR, Prefix, ProviderCategories, SocietyPrefixes_FR, SupplierCategories_FR } from '../../../shared/constants/list_of_constants';
import { Provider } from '../../../models/components/provider';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { CounterPart } from '../../../models/components/counterpart';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteModalComponent } from '../../../dashboard/modals/confirm-delete-modal/confirm-delete-modal.component';

@Component({
  selector: 'app-list-provider',
  templateUrl: './list-provider.component.html',
  styleUrl: './list-provider.component.css'
})
export class ListProviderComponent implements OnInit {

  counterPartService = inject(CounterpartService);
  authService = inject(AuthenticationService);
  dialog = inject(MatDialog);
  //#region labels
  mat_header_cell_provider_prefix: string = 'Sté';
  mat_header_cell_provider_name: string = 'Nom';
  mat_header_cell_provider_description: string = 'Description';
  mat_header_cell_provider_matricule_fiscal: string = 'Matricule Fiscal';
  mat_header_cell_provider_phone_one: string = 'Téléphone 1';
  mat_header_cell_provider_phone_two: string = 'Téléphone 2'
  mat_header_cell_provider_category: string = 'Catégorie';
  mat_header_cell_provider_phone_email: string = 'Email';
  mat_header_cell_provider_responsable: string = 'Responsable';
  //#endregion

  //#region Update Provider
  //#region Labels and Informations
  general_information_provider: string = GENERAL_INFORMATION_PROVIDER;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  update_button: string = UPDATE_BUTTON;
  //#endregion

  selectedProviderForm!: FormGroup;
  allPrefixes = Object.values(SocietyPrefixes_FR);
  allProvidersCategories = Object.values(SupplierCategories_FR);
  allBanks = BANKS_TN;

  selectedSupplier!: CounterPart | null;
  isSupplierToEdit: boolean = false;
  //#endregion

  loading: boolean = false; // Track loading state

  @ViewChild(MatPaginator) PaginationSupplier!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // allProviders: MatTableDataSource<Provider> = new MatTableDataSource<Provider>();
  allSuppliers: MatTableDataSource<CounterPart> = new MatTableDataSource<CounterPart>();
  displayedProvidersColumns: string[] = ['prefix', 'name', 'description', 'responsable', 'taxregistration', 'phoneone', 'phonetwo', 'email', 'action'];


  constructor(
    private toastr: ToastrService,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.getSuppliers();
      this.allSuppliers.paginator = this.PaginationSupplier;
      this.allSuppliers.sort = this.sort;
    }

  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.allSuppliers.filter = filterValue.trim().toLowerCase();

    if (this.PaginationSupplier) {
      this.PaginationSupplier.firstPage();
    }
  }

  editProvider(supplier: CounterPart) {
    supplier.editing = true;
    this.selectedSupplier = supplier;

    this.createForm();

    // Patch the form with the selected article's values
    this.selectedProviderForm.patchValue({
      prefix: supplier.prefix,
      name: supplier.name,
      description: supplier.description,
      taxRegistration: supplier.taxregistrationnumber,
      email: supplier.email,
      address: supplier.address,
      category: Number(supplier.jobtitle),
      representedBySurname: supplier.firstname,
      representedByName: supplier.lastname,
      phoneOne: supplier.phonenumberone,
      phoneTwo: supplier.phonenumbertwo,
      bank: BANKS_TN.find(bk => bk.key === supplier.bankname)?.key,
      bankAccountNumber: supplier.bankaccountnumber
    });
  }

  cancelEditSupplier(element: CounterPart) {
    element.editing = false;
    this.selectedSupplier = null;
  }

  deleteSupplier(element: CounterPart) {
    const item = { id: element.id, name: element.name };
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Item deleted:', item);
        this.counterPartService.Delete(element.id).subscribe({
          next: () => {
            this.allSuppliers.data = this.allSuppliers.data.filter(p => p.id !== element.id);
            this.toastr.success('Supplier deleted successfully');
          },
          error: () => this.toastr.error('Error deleting Supplier')
        });
      } else {
        this.toastr.info("Suppression anuulé");
        console.log('Deletion canceled');
      }
    });

  }




  getSuppliers() {
    this.loading = true;
    this.counterPartService.GetAll(CounterPartType_FR.supplier).subscribe({
      next: (response) => {
        console.log('Successfully fetched providers', response);
        this.allSuppliers.data = response;
        this.allSuppliers.paginator = this.PaginationSupplier;
        this.allSuppliers.sort = this.sort;
        this.loading = false; // Stop loading after data is fetched
      },
      error: (error) => {
        // console.error('Error fetching providers', error);
        // this.toastr.error('Error loading Providers');
      }
    });
  }


  //#region Edit Provider

  updateProvider(): void {
    let supplier = this.selectedSupplier as CounterPart;
    let _supplier = this.confirmBeforeSaveEdit(supplier);

    if (!_supplier) {
      // Exit if the article validation failed (i.e., if _article is null)
      return;
    }

    // Dispatch the updateArticle action with the article data
    // this.store.dispatch(ArticleActions.updateArticle({ id: article.id, article: _article }));

    this.counterPartService.Put(supplier.id, _supplier).subscribe({
      next: (response) => {
        console.log("Updated Provider RESPONSE : ", response);
        this.toastr.success(response.name, 'Mis à jour');
        this.getSuppliers();
      },
      error: (error) => {
        console.error('Error Updating Articles:', error);
        const errorMessage = error.error?.message || 'Erreure lors de la mise à jour'; // Default message if no specific error message
        this.toastr.warning(errorMessage, 'Erreur');
        this.getSuppliers();
      }
    });
  }

  confirmBeforeSaveEdit(supplier: CounterPart): CounterPart | null {
    if (supplier != null) {
      // Rest of the mapping logic
      if (this.selectedProviderForm.valid) {
        const formValues = this.selectedProviderForm.value;
        supplier.id = this.selectedSupplier!.id || 0;
        supplier.updatedbyid = 1; // Example hard-coded user, should be dynamic

        // Map article fields from the form
        supplier.name = formValues.name;
        supplier.description = formValues.description;
        supplier.lastname = formValues.representedbyname;
        supplier.updatedate = new Date();

      }
      return supplier; // Return the valid Provider
    }
    return null;
  }

  createForm() {
    this.selectedProviderForm = this.fb.group({
      prefix: ['', Validators.required],
      name: ['', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      category: ['', Validators.required],
      phoneOne: ['', Validators.required],
      phoneTwo: ['', Validators.required],
      taxRegistration: ['', [fiscalMatriculeValidator()]], // Apply the custom validator here
      email: ['', Validators.email],
      representedByName: ['', Validators.required],
      representedBySurname: ['', Validators.required],
      bank: ['', Validators.required],
      bankAccountNumber: ['', Validators.required]
    });
  }

  //#region 

}
