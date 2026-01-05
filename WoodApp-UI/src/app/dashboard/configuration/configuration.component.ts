import { AfterViewInit, ChangeDetectorRef, Component, inject, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddBankModalComponent } from '../modals/add-bank-modal/add-bank-modal.component';
import { AddSalesSiteModalComponent } from '../modals/add-sales-site-modal/add-sales-site-modal.component';
import { AddCategoriesModalComponent } from '../modals/add-categories-modal/add-categories-modal.component';
import { DEVISES, GOV_TN, JOB_DESCRIPTION } from '../../shared/constants/modals/sales_site_modal';
import {
  MAT_CARD_BANK_ACCOUNT_HEADER,
  MAT_CARD_HEADER_ENTERPRISE, MAT_CARD_HEADER_DETAILS, MAT_CARD_HEADER_ENTER_SITES, MAT_CARD_HEADER_TAXE, MAT_CARD_HEADER_TVA, MAT_CARD_SETTINGS_CONFIG, MAT_HEADER_SELL_BANK_ACTION as MAT_HEADER_CELL_BANK_ACTION, MAT_HEADER_SELL_BANK_AGENCY as MAT_HEADER_CELL_BANK_AGENCY, MAT_HEADER_SELL_BANK_DESCRIPTION as MAT_HEADER_CELL_BANK_DESCRIPTION, MAT_HEADER_SELL_BANK_IBAN as MAT_HEADER_CELL_BANK_IBAN, MAT_HEADER_SELL_BANK_NAME as MAT_HEADER_CELL_BANK_NAME, MAT_HEADER_SELL_BANK_RIB as MAT_HEADER_CELL_BANK_RIB, MAT_HEADER_SELL_DESC as MAT_HEADER_CELL_DESC, MAT_HEADER_SELL_REF as MAT_HEADER_CELL_REF, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_ADRESSE, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CITY, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_CODEPOST, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_DEVISE, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_MF, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_POSITION, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_NAME, MAT_INPUT_ENTERPRISE_DETAILS_PLCHOLDER_RESP_SURNAME, MAT_INPUT_ENTERPRISE_PLCHOLDER_DESC, MAT_INPUT_ENTERPRISE_PLCHOLDER_EMAIL, MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_1, MAT_INPUT_ENTERPRISE_PLCHOLDER_MOBILE_2, MAT_INPUT_ENTERPRISE_PLCHOLDER_NAME, MAT_INPUT_ENTERPRISE_PLCHOLDER_PHONE, MAT_LABEL_INPUT_ENTERPRISE_DESC, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_ADDRESS, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CITY, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_CODEPOST, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_DEVISE, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_GOV, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_MF, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_POSITION, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_NAME, MAT_LABEL_INPUT_ENTERPRISE_DETAILS_RESP_SURNAME, MAT_LABEL_INPUT_ENTERPRISE_FIX_PHONE, MAT_LABEL_INPUT_ENTERPRISE_MAIL, MAT_LABEL_INPUT_ENTERPRISE_MOBILE_1, MAT_LABEL_INPUT_ENTERPRISE_MOBILE_2, MAT_LABEL_INPUT_ENTERPRISE_NAME,
  MAT_TAB_LABEL_BANK_ACCOUNT,
  MAT_TAB_LABEL_ENTERPRISE,
  MAT_TAB_LABEL_PARAMS,
  MAT_TAB_LABEL_SETTINGS,
  MAT_HEADER_CELL_ACTIONS,
  MAT_HEADER_SELL_REF,
  MAT_CARD_HEADER_DIMENSION
} from '../../shared/constants/components/config';
import { UPDATE_BUTTON, ADD_BUTTON } from '../../shared/Text_Buttons'
import { ToastrService } from 'ngx-toastr';
import { CategoryService } from '../../services/configuration/category.service';
import { Category, SubCategory } from '../../models/configuration/category';
import { LOAD_CATEGORIES_SUCCESS } from '../../shared/constants/toastr/msg_success';
import { LOAD_CATEGORIES_ERROR } from '../../shared/constants/toastr/msg_error';
import { SubCategoryService } from '../../services/configuration/sub-category.service';
import { AddSubCategoriesModalComponent } from '../modals/add-sub-categories-modal/add-sub-categories-modal.component';
import { ERROR_UPDATE_CATEGORY, ERROR_UPDATE_SUB_CATEGORY, SUCCESS_UPDATE_CATEGORY, SUCCESS_UPDATE_SUB_CATEGORY } from '../../shared/constants/modals/categories_modal';
import { combineLatest, forkJoin, Observable, tap } from 'rxjs';
import { BankService } from '../../services/configuration/bank.service';
import { Bank } from '../../models/configuration/bank';
import { ERROR_UPDATE_BANK, LOAD_BANK_ERROR, LOAD_BANK_SUCCESS, SUCCESS_UPDATE_BANK } from '../../shared/constants/modals/bank_modal';
import { AppVariableModalComponent } from '../modals/add-app-variable-modal/app-variable-modal.component';
import { AppVariable } from '../../models/configuration/appvariable';
import { LOAD_TAXES_ERROR, LOAD_TAXES_SUCCESS, LOAD_TVA_ERROR, LOAD_TVA_SUCCESS, MAT_CARD_HEADER_LENGTH, MAT_HEADER_CELL_DIMENSION_ISACTIVE, MAT_HEADER_CELL_DIMENSION_ISDEFAULT, MAT_HEADER_CELL_DIMENSION_NAME, MAT_HEADER_CELL_DIMENSION_NATURE, MAT_HEADER_CELL_DIMENSION_VALUE, MAT_HEADER_CELL_LENGTH_ISACTIVE, MAT_HEADER_CELL_LENGTH_ISDEFAULT, MAT_HEADER_CELL_LENGTH_NAME, MAT_HEADER_CELL_LENGTH_NATURE, MAT_HEADER_CELL_LENGTH_VALUE, MAT_HEADER_CELL_TAXE_ISACTIVE, MAT_HEADER_CELL_TAXE_ISDEFAULT, MAT_HEADER_CELL_TAXE_ISEDITABLE, MAT_HEADER_CELL_TAXE_NAME, MAT_HEADER_CELL_TAXE_VALUE } from '../../shared/constants/modals/app_variable_modal';
import { AppVariableService } from '../../services/configuration/app-variable.service';
import { Nature } from '../../models/configuration/dimensions';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AppVariableState } from '../../store/reducers/appvariable.reducer';
import { select, Store } from '@ngrx/store';
import { loadAppVariables } from '../../store/actions/appvariable.actions';
import { selectAppVariablesByNature } from '../../store/selectors/appvariable.selectors';
import { loadBanks } from '../../store/actions/bank.actions';
import { selectAllBanks } from '../../store/selectors/bank.selectors';
import { loadCategories } from '../../store/actions/category.actions';
import { selectAllCategories } from '../../store/selectors/category.selectors';
import { PermissionsModalComponent } from '../modals/permissions-modal/permissions-modal.component';
import { AppUser, Person, ROLE_TRANSLATIONS } from '../../models/components/appuser';
import { AddEmployeesModalComponent } from '../modals/add-employees-modal/add-employees-modal.component';
import { EmployeeService } from '../../services/components/employee.service';
import { AccountService } from '../../services/components/account.service';
import { EnterpriseService } from '../../services/components/enterprise.service';
import { Enterprise } from '../../models/components/enterprise';
import { error } from 'console';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Site } from '../../models/components/sites';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { response } from 'express';
import { AuthenticationService } from '../../services/components/authentication.service';
import { Router } from '@angular/router';
import { SalessitesService } from '../../services/components/salessites.service';
import { AppuserService } from '../../services/components/appuser.service';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css'
})
export class ConfigurationComponent implements AfterViewInit, OnInit {

  enterpriseService = inject(EnterpriseService);
  fb = inject(FormBuilder);
  authService = inject(AuthenticationService);
  sitesService = inject(SalessitesService);
  router = inject(Router);
  appuserService = inject(AppuserService);
  //#region Labels Constants
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

  // CARD ENTERPRiSE SITES
  mat_card_header_enter_sites: string = MAT_CARD_HEADER_ENTER_SITES;

  // TAB SETTINGS
  // CARD CATEGORY
  mat_tab_label_settings: string = MAT_TAB_LABEL_SETTINGS;

  mat_card_settings_config: string = MAT_CARD_SETTINGS_CONFIG;
  // TABLE CATEGORY
  mat_header_cell_ref: string = MAT_HEADER_CELL_REF;
  mat_header_cell_desc: string = MAT_HEADER_CELL_DESC;
  mat_header_cell_actions: string = MAT_HEADER_CELL_ACTIONS;

  // CARD TAXE
  mat_card_header_taxe: string = MAT_CARD_HEADER_TAXE;

  // CARD TVA
  mat_card_header_tva: string = MAT_CARD_HEADER_TVA;

  // CARD DIMENSION
  mat_card_header_dimension: string = MAT_CARD_HEADER_DIMENSION;
  mat_header_cell_dimension_name: string = MAT_HEADER_CELL_DIMENSION_NAME;
  mat_header_cell_dimension_value: string = MAT_HEADER_CELL_DIMENSION_VALUE;
  mat_header_cell_dimension_nature: string = MAT_HEADER_CELL_DIMENSION_NATURE;
  mat_header_cell_dimension_isactive: string = MAT_HEADER_CELL_DIMENSION_ISACTIVE;
  mat_header_cell_dimension_isdefault: string = MAT_HEADER_CELL_DIMENSION_ISDEFAULT;

  // CARD LENGTH
  mat_card_header_length: string = MAT_CARD_HEADER_LENGTH;
  mat_header_cell_length_name: string = MAT_HEADER_CELL_LENGTH_NAME;
  mat_header_cell_length_value: string = MAT_HEADER_CELL_LENGTH_VALUE;
  mat_header_cell_length_nature: string = MAT_HEADER_CELL_LENGTH_NATURE;
  mat_header_cell_length_isactive: string = MAT_HEADER_CELL_LENGTH_ISACTIVE;
  mat_header_cell_length_isdefault: string = MAT_HEADER_CELL_LENGTH_ISDEFAULT;


  // TAB BANK ACCOUNT
  // CARD CATEGORY
  mat_tab_label_bank_account: string = MAT_TAB_LABEL_BANK_ACCOUNT;

  mat_card_bank_account_header: string = MAT_CARD_BANK_ACCOUNT_HEADER;
  // TABLE BANK ACCOUNTS
  mat_header_cell_bank_name: string = MAT_HEADER_CELL_BANK_NAME;
  mat_header_cell_bank_description: string = MAT_HEADER_CELL_BANK_DESCRIPTION;
  mat_header_cell_bank_agency: string = MAT_HEADER_CELL_BANK_AGENCY;
  mat_header_cell_bank_rib: string = MAT_HEADER_CELL_BANK_RIB;
  mat_header_cell_bank_iban: string = MAT_HEADER_CELL_BANK_IBAN;
  mat_header_cell_bank_action: string = MAT_HEADER_CELL_BANK_ACTION;

  // TABLE TAXES
  mat_header_cell_taxe_name: string = MAT_HEADER_CELL_TAXE_NAME;
  mat_header_cell_taxe_value: string = MAT_HEADER_CELL_TAXE_VALUE;
  mat_header_cell_taxe_isactive: string = MAT_HEADER_CELL_TAXE_ISACTIVE;
  mat_header_cell_taxe_iseditable: string = MAT_HEADER_CELL_TAXE_ISEDITABLE;
  mat_header_cell_taxe_isdefault: string = MAT_HEADER_CELL_TAXE_ISDEFAULT;

  // BUTTON TEXTS
  update_button: string = UPDATE_BUTTON;
  add_button: string = ADD_BUTTON;

  //#endregion

  //#region toastr
  load_categories_success: string = LOAD_CATEGORIES_SUCCESS;
  load_categories_error: string = LOAD_CATEGORIES_ERROR;

  load_taxes_success: string = LOAD_TAXES_SUCCESS;
  load_taxes_error: string = LOAD_TAXES_ERROR;

  load_tva_success: string = LOAD_TVA_SUCCESS;
  load_tva_error: string = LOAD_TVA_ERROR;

  load_bank_success: string = LOAD_BANK_SUCCESS;
  load_bank_error: string = LOAD_BANK_ERROR;

  update_categories_success: string = SUCCESS_UPDATE_CATEGORY;
  update_categories_error: string = ERROR_UPDATE_CATEGORY;

  update_sub_categories_success: string = SUCCESS_UPDATE_SUB_CATEGORY;
  update_sub_categories_error: string = ERROR_UPDATE_SUB_CATEGORY;

  update_bank_success: string = SUCCESS_UPDATE_BANK;
  update_bank_error: string = ERROR_UPDATE_BANK;
  //#endregion

  //#region Variables Init

  enterpriseForm!: FormGroup;
  enterpriseData: Enterprise = new Enterprise();

  allSitesForm!: FormGroup;


  allSites: MatTableDataSource<Site> = new MatTableDataSource<Site>();
  displayedSitesColumns: string[] = ['number', 'address', '_gov', 'isForsale', 'action'];

  categories: Category[] = []; // Replace with your categories data type
  selectedCategory: any = { firstchildren: [] };

  /**
   * Display All Categories in a Sortable Table
   */
  allCategories: MatTableDataSource<Category> = new MatTableDataSource<Category>();
  displayedCategoriesColumns: string[] = ['reference', 'description', 'actions'];


  appvariablesTaxes: AppVariable[] = [];
  displayedAppVariablesTaxesColumns: string[] = ['name', 'value', 'isactive', 'isdefault', 'action'];

  appvariablesTVA: AppVariable[] = [];
  displayedAppVariablesTVAColumns: string[] = ['name', 'value', 'isactive', 'isdefault', 'action'];

  //appvariablesDimension: AppVariable[] = [];
  appvariablesDimension: MatTableDataSource<AppVariable> = new MatTableDataSource<AppVariable>();
  displayedAppVariablesDimensionsColumns: string[] = ['name', 'value', 'nature', 'isactive', 'action'];

  appvariablesLength: MatTableDataSource<AppVariable> = new MatTableDataSource<AppVariable>();
  displayedAppVariablesLengthColumns: string[] = ['name', 'value', 'isactive', 'action'];

  //bankAccounts$: Observable<Bank[]>;
  bankAccounts: Bank[] = [];
  displayedColumns: string[] = ['reference', 'designation', 'agency', 'rib', 'iban', 'action'];

  displayedCategoryColumns: string[] = ['reference', 'description', 'actions'];
  displayedSubcategoryColumns: string[] = ['subReference', 'subDescription', 'actions'];

  allEmployees: MatTableDataSource<Person> = new MatTableDataSource<Person>();
  displayedEmployeesColumns: string[] = ['fullname', 'cin', 'idcnss', 'role', 'hiredate', 'creationdate', 'action'];

  allAppUsers: MatTableDataSource<AppUser> = new MatTableDataSource<AppUser>();
  displayedAppUsersColumns: string[] = ['fullname', 'cin', 'email', 'login', 'role', 'hiredate', 'creationdate', 'updatedate', 'action', 'permissions', 'defaultsite'];

  displayedColumnsTaxes: string[] = ['name', 'context', 'value', 'applied'];
  displayedColumnsTVA: string[] = ['value', 'action'];


  //dataSource = ELEMENT_DATA;
  ROLE_TRANSLATIONS = ROLE_TRANSLATIONS; // make it accessible in template
  govOptions = GOV_TN;
  usersCount = 0;
  personsCount = 0;
  jobDescOptions = Object(JOB_DESCRIPTION);
  devisesOptions = Object(DEVISES);
  isSiteEdit: boolean = false;
  //@ViewChild(MatPaginator) paginator!: MatPaginator;

  @ViewChild('paginatorDimension', { static: true }) paginatorDimension!: MatPaginator;
  @ViewChild('paginatorLength', { static: true }) paginatorLength!: MatPaginator;

  @ViewChild(MatPaginator) paginationCategories!: MatPaginator;
  @ViewChild(MatSort) sortCategories!: MatSort;

  //#endregion

  //#region constructor
  constructor(public dialog: MatDialog,
    private categoryService: CategoryService,
    private bankService: BankService,
    private appvarService: AppVariableService,
    private employeeService: EmployeeService,
    private toastr: ToastrService,
    private subCategoryService: SubCategoryService,
    private cdr: ChangeDetectorRef,
    private store: Store<{ appVariableState: AppVariableState }>) { }
  //#endregion

  //#region ngOnInit => ngAfterViewInit

  ngOnInit(): void {
    this.createEnterpriseForm();
    this.createSiteForm();
    this.getEnterpriseInfos();
  }

  ngAfterViewInit(): void {
    this.appvariablesDimension.paginator = this.paginatorDimension;
    this.appvariablesLength.paginator = this.paginatorLength;
    /**
     * Categories Sort and Pagination
     */
    this.allCategories.paginator = this.paginationCategories;
    this.allAppUsers.sort = this.sortCategories;
    this.reloadData();
  }

  reloadData() {
    console.log('Reload Data Clicked');


    this.getAllCategories();
    this.getAllBanksAccounts();
    this.getAllTaxes();
    this.getAllTva();
    this.getAllDimensions();
    this.getAllLength();
    this.getAllEmployees();
    this.getAllAppUsers();
  }
  //#endregion

  //#region Enterprise

  // getAllBanksAccounts() {
  //   this.bankService.GetAll().subscribe({
  //     next: (response) => {
  //       this.bankAccounts = response
  //       //console.log("getBanksAccounts() Method : ", this.bankAccounts);
  //       this.toastr.success(this.load_bank_success);
  //     },

  // createEnterpriseForm() {
  //   this.enterpriseForm = this.fb.group({
  //     name: [{ value: this.enterpriseData.name, disabled: true }, Validators.required],
  //     address: [{ value: this.enterpriseData.description, disabled: true }, Validators.required],
  //     email: [{ value: this.enterpriseData.email, disabled: true }, Validators.required],
  //     phone: [{ value: this.enterpriseData.phone, disabled: true }, Validators.required],
  //     mobileOne: [{ value: this.enterpriseData.mobileOne, disabled: true }, Validators.required],
  //     mobileTwo: [{ value: this.enterpriseData.mobileTwo, disabled: true }, Validators.required],
  //     matriculeFiscal: [{ value: this.enterpriseData.matriculeFiscal, disabled: true }, Validators.required],
  //     devise: [{ value: this.enterpriseData.devise, disabled: true }],
  //     nameResponsable: [{ value: this.enterpriseData.nameResponsable, disabled: true }, Validators.required],
  //     surnameResponsable: [{ value: this.enterpriseData.surnameResponsable, disabled: true }, Validators.required],
  //     positionResponsable: [{ value: this.enterpriseData.positionResponsable, disabled: true }, Validators.required],
  //     siegeAddress: [{ value: this.enterpriseData.siegeAddress, disabled: true }, Validators.required],
  //     commercialRegister: [{ value: this.enterpriseData.commercialregister, disabled: true }, Validators.required],
  //     capital: [{ value: this.enterpriseData.capital, disabled: true }, Validators.required],
  //   });
  // }

  createEnterpriseForm() {
    this.enterpriseForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      address: ['', Validators.required],
      email: ['', Validators.required],
      phone: ['', Validators.required],
      mobileOne: ['', Validators.required],
      mobileTwo: ['', Validators.required],
      matriculeFiscal: ['', Validators.required],
      devise: [''],
      nameResponsable: ['', Validators.required],
      surnameResponsable: ['', Validators.required],
      positionResponsable: ['', Validators.required],
      siegeAddress: ['', Validators.required],
      commercialRegister: ['', Validators.required],
      capital: ['', Validators.required],
    });
  }

  createSiteForm() {
    this.allSitesForm = this.fb.group({
      number: [''],
      address: [''],
      _gov: [''],
      isForsale: ['']
    })
  }

  patchEnterpriseValues(formValues: Enterprise) {
    this.enterpriseForm.patchValue({
      // Patch the form with enterprise data
      name: formValues.name,
      description: formValues.description,
      email: formValues.email,
      phone: formValues.phone,
      mobileOne: formValues.mobileOne,
      mobileTwo: formValues.mobileTwo,
      matriculeFiscal: formValues.matriculeFiscal,
      devise: this.getDevisKeyByValue(formValues.devise),
      nameResponsable: formValues.nameResponsable,
      surnameResponsable: formValues.surnameResponsable,
      positionResponsable: this.getPositionByValue(formValues.positionResponsable),
      siegeAddress: formValues.siegeAddress,
      commercialRegister: formValues.commercialregister,
      capital: formValues.capital
    });
  }

  private getDevisKeyByValue(_val: string): number | null {
    const devis = this.devisesOptions.find(
      (devis: { key: number, value: string }) => devis.value === _val
    );
    return devis ? devis.key : null; // Return null if not found
  }


  private getPositionByValue(_val: string): number | null {
    const position = this.jobDescOptions.find(
      (position: { key: number, value: string }) => position.value === _val
    );
    return position ? position.key : null; // Return null if not found
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
        this.enterpriseData = response;
        this.allSites.data = response.sites!;
        console.log("this.authService.getEnterpriseId() : Response: this.enterpriseData ", this.enterpriseData);
        this.patchEnterpriseValues(this.enterpriseData);


      }, error: (error) => {
        this.toastr.error(error.message);
        this.toastr.show("Réessayer plus tard");
      }
    });
  }

  enableForm(): void {
    this.enterpriseForm.enable(); // Enables all fields in the form
  }

  onToggleChange(event: MatSlideToggleChange, element: any): void {
    element.isForsale = event.checked;
  }

  editSite(index: number) {
    this.isSiteEdit = true;
  }

  saveSite(index: number) {
    this.isSiteEdit = false;
  }

  cancelEditSite(index: number) {
    this.isSiteEdit = false;
  }

  deleteSite(index: number): void {
    const currentData = this.allSites.data;
    currentData.splice(index, 1);  // Remove the element at the specified index
    this.allSites.data = [...currentData];  // Refresh the data source

    // Manually trigger change detection to update the row numbers
    this.cdr.detectChanges();
  }
  //#endregion

  //#region TAXE
  openAddAppVarDialog(nature: string) {
    const dialogRef = this.dialog.open(AppVariableModalComponent, {
      width: '600px',
      height: '400px',
      data: { nature: nature }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log("AppVar ADD", result);
      }
    });
  }


  getAllTaxes(): void {
    this.store.dispatch(loadAppVariables({ nature: 'Taxe' }));

    this.store.pipe(select(selectAppVariablesByNature('Taxe'))).subscribe((appVariables) => {
      this.appvariablesTaxes = appVariables;
    });
  }


  deleteTaxe(index: number): void {
    //this.taxes.splice(index, 1);
  }

  editTaxe(appvar: AppVariable): void {
    // Create a new instance of AppVariable and clone the existing properties
    const updatedAppvar = { ...appvar, editing: true };

    // Find the index of the element in the data array
    const index = this.appvariablesTaxes.findIndex(item => item.id === appvar.id);

    // Replace the element in the data array
    const updatedData = [...this.appvariablesTaxes];
    updatedData[index] = updatedAppvar;

    // Update the dataSource with the new data array
    this.appvariablesTaxes = updatedData;
  }

  saveTaxe(appvar: AppVariable): void {
    this.appvarService.Put(appvar.id, appvar).pipe(
      tap({
        next: (updateAppVar) => {
          //console.log('Edit successful:', updatedSubCategory);
          appvar.editing = false;
          this.toastr.success(this.update_bank_success);
        },
        error: (error) => {
          this.toastr.error(this.update_bank_error);
          // Handle the error, e.g., display a message to the user.
        }
      })
    ).subscribe();
  }

  cancelEditTaxe(appvar: AppVariable): void {
    appvar.editing = false;
  }

  //#endregion

  //#region TVA
  deleteTVA(index: number): void {
    //this.tva.splice(index, 1);
  }

  getAllTva(): void {
    this.store.dispatch(loadAppVariables({ nature: 'Tva' }));

    this.store.pipe(select(selectAppVariablesByNature('Tva'))).subscribe((appVariables) => {
      this.appvariablesTVA = appVariables;
    });
  }


  deleteTva(index: number): void {
    //this.tva.splice(index, 1);
  }

  editTva(appvar: AppVariable): void {
    // Create a new instance of AppVariable and clone the existing properties
    const updatedAppvar = { ...appvar, editing: true };

    // Find the index of the element in the data array
    const index = this.appvariablesTVA.findIndex(item => item.id === appvar.id);

    // Replace the element in the data array
    const updatedData = [...this.appvariablesTVA];
    updatedData[index] = updatedAppvar;

    // Update the dataSource with the new data array
    this.appvariablesTVA = updatedData;
  }

  saveTva(appvar: AppVariable): void {
    this.appvarService.Put(appvar.id, appvar).pipe(
      tap({
        next: (updateAppVar) => {
          appvar.editing = false;
          this.toastr.success(this.update_bank_success);
        },
        error: (error) => {
          this.toastr.error(this.update_bank_error);
          // Handle the error, e.g., display a message to the user.
        }
      })
    ).subscribe();
  }

  cancelEditTva(appvar: AppVariable): void {
    appvar.editing = false;
  }
  //#endregion

  //#region Dimensions
  // getAllDimensions() {
  //   const thicknessRequest = this.appvarService.GetAll('thickness');
  //   const widthRequest = this.appvarService.GetAll('width');

  //   forkJoin([thicknessRequest, widthRequest]).subscribe({
  //     next: ([thicknessResponse, widthResponse]: [AppVariable[], AppVariable[]]) => {
  //       // Combine the results and group them by nature
  //       const combinedData = [
  //         ...thicknessResponse.map(item => ({ ...item, nature: Nature.thickness })),
  //         ...widthResponse.map(item => ({ ...item, nature: Nature.width })),
  //       ];
  //       this.appvariablesDimension.data = combinedData;
  //       this.appvariablesDimension.paginator = this.paginatorDimension; // Set paginator after data is set
  //       // console.log("getAllDimensions() Method : ", this.appvariablesDimension);
  //     },
  //     error: (error) => {
  //       console.error('Error fetching Dimensions:', error);
  //     }
  //   });
  // }

  getAllDimensions(): void {
    // Dispatch actions for both thickness and width
    this.store.dispatch(loadAppVariables({ nature: 'thickness' }));
    this.store.dispatch(loadAppVariables({ nature: 'width' }));

    // Use combineLatest to react to any changes in the selected data
    combineLatest([
      this.store.pipe(select(selectAppVariablesByNature('thickness'))),
      this.store.pipe(select(selectAppVariablesByNature('width')))
    ]).subscribe(([thicknessResponse, widthResponse]) => {
      // Ensure both responses are not undefined before proceeding
      if (thicknessResponse && widthResponse) {
        console.log('COMBINED DATA DIMENSIONS ARE : ', thicknessResponse, widthResponse);

        // Combine the data from both thickness and width
        const combinedData = [
          ...thicknessResponse.map(item => ({ ...item, nature: Nature.thickness })),
          ...widthResponse.map(item => ({ ...item, nature: Nature.width }))
        ];

        // Assign the combined data to the MatTableDataSource
        this.appvariablesDimension.data = combinedData;
        console.log("ALL DIMENSIONS ARE : ", this.appvariablesDimension.data);
        this.appvariablesDimension.paginator = this.paginatorDimension; // Set paginator after data is set
      } else {
        console.error('Error: One of the responses is undefined.');
      }
    });
  }

  deleteDimension(index: number): void {
    //this.tva.splice(index, 1);
  }

  editDimension(appvar: AppVariable): void {
    appvar.editing = true;
  }

  cancelEditDimension(appvar: AppVariable): void {
    appvar.editing = false;
  }

  saveDimension(appvar: AppVariable): void {
    // Reverse lookup to get the enum key by its value
    const enumKey = Object.keys(Nature).find(key => Nature[key as keyof typeof Nature] === appvar.nature);
    // If the enum key is found, update the nature property
    if (enumKey) {
      appvar.nature = enumKey;
    }
    this.appvarService.Put(appvar.id, appvar).pipe(
      tap({
        next: (updateAppVar) => {
          appvar.editing = false;
          this.toastr.success(this.update_bank_success);
        },
        error: (error) => {
          this.toastr.error(this.update_bank_error);
          // Handle the error, e.g., display a message to the user.
        }
      })
    ).subscribe();
  }

  //#endregion

  //#region Length
  deleteLength(index: number): void {
    //this.tva.splice(index, 1);
  }

  // editLength(appvar: AppVariable): void {
  //   appvar.editing = true;
  // }

  editLength(appvar: AppVariable): void {
    // Create a new instance of AppVariable and clone the existing properties
    const updatedAppvar = { ...appvar, editing: true };

    // Find the index of the element in the data array
    const index = this.appvariablesLength.data.findIndex(item => item.id === appvar.id);

    // Replace the element in the data array
    const updatedData = [...this.appvariablesLength.data];
    updatedData[index] = updatedAppvar;

    // Update the dataSource with the new data array
    this.appvariablesLength.data = updatedData;
  }

  cancelEditLength(appvar: AppVariable): void {
    appvar.editing = false;
  }

  saveLength(appvar: AppVariable): void {
  }

  // getAllLength() {
  //   this.appvarService.GetAll('Length').subscribe({
  //     next: (response: AppVariable[]) => {
  //       // Sort the response array by the 'value' property in descending order
  //       response.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

  //       this.appvariablesLength.data = response
  //       this.appvariablesLength.paginator = this.paginatorLength; // Set paginator after data is set

  //       //this.toastr.success(this.load_tva_success);
  //     },
  //     // error: (error) => {
  //     //   //console.error('Error fetching categories:', error);
  //     //   this.toastr.error(this.load_taxes_error);
  //     // }
  //   });
  // }
  getAllLength(): void {
    // Dispatch the action to load Length data
    this.store.dispatch(loadAppVariables({ nature: 'Length' }));

    // Subscribe to the selector to get the 'Length' data
    this.store.pipe(select(selectAppVariablesByNature('Length'))).subscribe((lengthResponse) => {
      // Sort the lengthResponse array by the 'value' property in descending order
      //lengthResponse.sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

      // Set the sorted data to the MatTableDataSource
      this.appvariablesLength.data = lengthResponse;
      this.appvariablesLength.paginator = this.paginatorLength; // Set paginator after data is set

      console.log("getAllLength() Method: ", this.appvariablesLength.data);
    });
  }

  getAllTva1(): void {
    this.store.dispatch(loadAppVariables({ nature: 'Tva' }));

    this.store.pipe(select(selectAppVariablesByNature('Tva'))).subscribe((appVariables) => {
      this.appvariablesTVA = appVariables;
    });
  }
  //#endregion

  //#region Bank Methods
  // getAllBanksAccounts() {
  //   this.bankService.GetAll().subscribe({
  //     next: (response) => {
  //       this.bankAccounts = response
  //       //console.log("getBanksAccounts() Method : ", this.bankAccounts);
  //       this.toastr.success(this.load_bank_success);
  //     },
  //     // error: (error) => {
  //     //   //console.error('Error fetching categories:', error);
  //     //   this.toastr.error(this.load_bank_error);
  //     // }
  //   });
  // }

  getAllBanksAccounts() {
    // this.store.dispatch(loadBanks());

    // this.store.pipe(select(selectAllBanks)).subscribe((bank) => {
    //   this.bankAccounts = bank;
    // });

    this.store.dispatch(loadBanks());
    this.store.pipe(select(selectAllBanks)).subscribe((banks) => {
      this.bankAccounts = banks;
    });
  }

  openAddBankDialog(): void {
    const dialogRef = this.dialog.open(AddBankModalComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.bankAccounts.push(result);
      }
    });
  }

  deleteBankAccount(account: any): void {
    const index = this.bankAccounts.indexOf(account);
    if (index >= 0) {
      this.bankAccounts.splice(index, 1);
    }
  }

  editBankAccount(bank: Bank): void {
    // Create a new instance of AppVariable and clone the existing properties
    const updatedBank = { ...bank, editing: true };

    // Find the index of the element in the data array
    const index = this.bankAccounts.findIndex(item => item.id === bank.id);

    // Replace the element in the data array
    const updatedData = [...this.bankAccounts];
    updatedData[index] = updatedBank;

    // Update the dataSource with the new data array
    this.bankAccounts = updatedData;
  }

  saveBankAccount(bank: Bank): void {
    this.bankService.Put(bank.id, bank).pipe(
      tap({
        next: (updatedSubCategory) => {
          //console.log('Edit successful:', updatedSubCategory);
          bank.editing = false;
          this.toastr.success(this.update_bank_success);
        },
        error: (error) => {
          this.toastr.error(this.update_bank_error);
          // Handle the error, e.g., display a message to the user.
        }
      })
    ).subscribe();
  }

  cancelEditBankAccount(bank: Bank): void {
    bank.editing = false;
  }

  //#endregion

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
        if (this.authService.isLoggedIn()) {
          console.log('this.authService.isLoggedIn()', this.authService.isLoggedIn())
          console.log('this.authService.getEnterpriseId', this.authService.getUserDetail()?.enterpriseId)
          result.enterpriseid = Number(this.authService.getUserDetail()?.enterpriseId);
          console.log('result.enterpriseid', result.enterpriseid);
        } else {
          this.router.navigateByUrl('/login');
        }

        this.sitesService.Add(result).subscribe({
          next: (response) => {
            console.log(response);
            this.getAllSalesSites();
            this.toastr.success("Site ajouté avec succés");
          }, error: (error) => {
            console.error('Error creating Site', error);
            this.toastr.error("Impossible de se Connecter au Serveur, Réessayer plus tard");
          }
        });

        this.allSites.data = [...this.allSites.data, result];

        console.log("Updated Table Data: ", this.allSites.data);

        // Trigger change detection manually
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * 
   * @param null
   * @returns All the created Sites
   */
  getAllSalesSites() {
    this.sitesService.GetAll().subscribe({
      next: (response) => {
        console.log("getAll AppUsers() Method RESPONSE : ", response);
        this.allSites.data = response;
      },
      error: (error) => {
        console.error('Error fetching Sales Sites:', error);
        this.toastr.error('Erreur récupération sites');
      }
    });
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

  //#endregion

  //#region Category Methods
  openAddCategoriesDialog(): void {
    const dialogRef = this.dialog.open(AddCategoriesModalComponent, {
      width: '600px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.categories.push(result);
        this.categories = [];
        this.getAllCategories();
      }
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategory = category;
    console.log(this.selectedCategory);
  }

  /**
  * On récupère toutes les Categories de la Base
  */
  getAllCategories() {
    this.categoryService.GetAll().subscribe({
      next: (response) => {
        // this.categories = response.map(category => ({
        //   ...category,
        //   firstchildren: category.firstchildren || []
        this.allCategories.data = response.map(category => ({
          ...category,
          firstchildren: category.firstchildren || []
        }));
        // Select the first category by default
        // if (this.categories.length > 0) {
        //   this.selectCategory(this.categories[0]);
        //   this.toastr.success(this.load_categories_success);
        // }
        if (this.allCategories.data.length > 0) {
          this.selectCategory(this.allCategories.data[0]);
          this.toastr.success(this.load_categories_success);
        }
        console.log("getCategories() Method : ", this.allCategories.data);
      },
      // error: (error) => {
      //   console.error('Error fetching categories:', error);
      //   this.toastr.error(this.load_categories_error);
      // }
    });
  }

  // getAllCategories1() {
  //   this.store.dispatch(loadCategories());

  //   this.store.pipe(select(selectAllCategories)).subscribe((categories) => {
  //     this.categories = categories.map(category => ({
  //       ...category,
  //       firstchildren: category.firstchildren || []
  //     }));
  //     // Select the first category by default
  //     if (this.categories.length > 0) {
  //       this.selectCategory(this.categories[0]);
  //     }
  //   });
  // }

  onAddSubCategory(subcategory: SubCategory): void {
    // Implement update logic here
    console.log('Update:', subcategory);
  }

  editSubCategory(subcategory: SubCategory): void {
    subcategory.editing = true;
  }

  saveSubCategory(subcategory: SubCategory): void {
    this.subCategoryService.Put(subcategory.id, subcategory).pipe(
      tap({
        next: (updatedSubCategory) => {
          subcategory.editing = false;
          this.toastr.success(this.update_sub_categories_success);
        },
        error: (error) => {
          this.toastr.error(this.update_sub_categories_error);
        }
      })
    ).subscribe();
  }

  saveCategory(category: Category): void {
    this.categoryService.Put(category.id, category).pipe(
      tap({
        next: (updatedCategory) => {
          console.log('Edit successful:', updatedCategory);
          this.toastr.success(this.update_categories_success);
          category.editing = false;
          this.categoryService.updateCategory(updatedCategory);
        },
        error: (error) => {
          this.toastr.error(this.update_categories_error);
        }
      })
    ).subscribe();
  }

  cancelEditSubCategory(subcategory: SubCategory): void {
    if (subcategory.id === 0) {
      // This is a newly added subcategory, remove it from the list
      const index = this.selectedCategory.firstchildren.indexOf(subcategory);
      if (index > -1) {
        this.selectedCategory.firstchildren.splice(index, 1);
      }
    } else {
      // Existing subcategory, just exit editing mode
      subcategory.editing = false;
    }
    // Notify Angular of the change
    this.cdr.markForCheck();
  }

  cancelEditCategory(category: Category): void {
    category.editing = false;
    // Optionally, revert changes by reloading the original subcategory data.
  }

  onDeleteSubCategory(subcategory: SubCategory): void {
    // Handle delete logic here
  }

  onEditSubCategory(subcategory: SubCategory): void {
    this.subCategoryService.Put(subcategory.id, subcategory).subscribe(
      (updatedSubCategory) => {
        console.log('Edit successful:', updatedSubCategory);
        // You can add additional logic here, such as updating the UI or navigating to another page.
      },
      (error) => {
        console.error('Edit failed:', error);
        // Handle the error, e.g., display a message to the user.
      }
    );
    console.log('Edit:', subcategory);
  }

  editCategory(category: Category): void {
    category.editing = true; // Enable editing mode
    console.log('Edit:', category);
  }

  onDeleteCategory(category: Category): void {
    // Implement delete logic here
    console.log('Delete:', category);
  }

  addSubCategory(category: Category): void {
    console.log("Ouverture de la Dialogue");
    this.dialog.open(AddSubCategoriesModalComponent, {
      width: '600px',
      data: {
        category: JSON.parse(JSON.stringify(category)),
      }
    });

  }
  //#endregion

  //#region Users and Persons

  getAddressById(siteId: number): string {
    const site = this.allSites.data.find(s => s.id === siteId);
    return site ? site.address : 'Non Attribué'; // Return 'N/A' if site not found
  }

  getAllEmployees(): void {
    this.allEmployees.data = [];
    this.employeeService.GetAll().subscribe({
      next: (response) => {
        console.log("getAll Employees() Method RESPONSE : ", response);
        this.allEmployees.data = response;

        this.allEmployees.data = [...this.allEmployees.data]; // Trigger change detection
        this.personsCount = this.allEmployees.data.length;
        console.log("getAllArticles() Method : ", this.allEmployees.data);
      },
      error: (error) => {
        console.error('Error fetching Articles:', error);

      }
    });
  }

  getAllAppUsers(): void {
    this.allAppUsers.data = [];
    this.appuserService.GetAll().subscribe({
      next: (response) => {
        console.log("getAll AppUsers() Method RESPONSE : ", response);
        this.allAppUsers.data = response;

        this.allAppUsers.data = [...this.allAppUsers.data]; // Trigger change detection
        this.usersCount = this.allAppUsers.data.length;
        console.log("getAllAppUsers() Method : ", this.allAppUsers.data);
      },
      error: (error) => {
        console.error('Error fetching AppUsers:', error);

      }
    });
  }

  editEmployee(element: Person) {
    this.openUpdatePersonsOrUsersDialog(null, element);
  }

  saveEmployee(element: Person) {

  }

  cancelEditEmployee(element: Person) {

  }

  deleteEmployee(element: Person) {

  }


  editAppUser(element: AppUser) {
    this.openUpdatePersonsOrUsersDialog(element, null);
  }

  saveAppUser(element: Person) {

  }

  cancelEditAppUser(element: Person) {

  }

  deleteAppUser(element: Person) {

  }



  getRoleDescription(role: number): string {
    return this.ROLE_TRANSLATIONS[role] || 'Role inconnu'; // Provide fallback if role is missing
  }

  openAddPersonsOrUsersDialog(addNature: string) {
    const dialogRef = this.dialog.open(AddEmployeesModalComponent, {
      width: '1300px',
      height: '780px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        inputType: addNature
      }
    });

    // Optional: handle actions after the dialog closes
    dialogRef.afterClosed().subscribe(result => {
      this.allEmployees.data = [];
      this.getAllEmployees();
      console.log('Dialog closed with result:', result);
    });
  }

  openUpdatePersonsOrUsersDialog(userToUpdate: AppUser | null, personToUpdate: Person | null) {
    const dialogRef = this.dialog.open(AddEmployeesModalComponent, {
      width: '1300px',
      height: '780px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      data: {
        person: personToUpdate == null ? JSON.parse(JSON.stringify(userToUpdate)) : JSON.parse(JSON.stringify(personToUpdate)),
        appuser: userToUpdate == null ? JSON.parse(JSON.stringify(personToUpdate)) : JSON.parse(JSON.stringify(userToUpdate)),
        inputType: personToUpdate == null ? 'updateAppUser' : 'updatePerson'
      }

    });
    // Optional: handle actions after the dialog closes
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
      if (result === 'updatedUser') {
        this.allAppUsers.data = [];
        this.getAllAppUsers();
      } else if (result === 'updatedPerson') {
        this.allEmployees.data = [];
        this.getAllEmployees();
      }
    });
  }

  openAddPermisionsDialog(element: AppUser) {
    const dialogRef = this.dialog.open(PermissionsModalComponent, {
      width: '1000px',
      height: '700px',
      maxWidth: '90vw',
      maxHeight: '150vh',
      data: {
        appuser: element
      }
    });

    // Optional: handle actions after the dialog closes
    dialogRef.afterClosed().subscribe(result => {
      console.log('Dialog closed with result:', result);
    });
  }

  //#endregion
}
