import { Component, ElementRef, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { ABORT_BUTTON, REGISTER_BUTTON, UPDATE_BUTTON } from '../../../shared/Text_Buttons';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { GENERAL_INFORMATION_CUSTOMER as GENERAL_INFORMATION_EMPLOYEE, GENERAL_INFORMATION_USER, UPDATE_INFORMATION_CUSTOMER } from '../../../shared/constants/components/article';
import { AppUser, Person, ROLE_TRANSLATIONS, Roles } from '../../../models/components/appuser';
import { ToastrService } from 'ngx-toastr';
import { EmployeeService } from '../../../services/components/employee.service';
import { AccountService } from '../../../services/components/account.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { GOV_TN } from '../../../shared/constants/modals/sales_site_modal';
import { Site } from '../../../models/components/sites';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { EnterpriseService } from '../../../services/components/enterprise.service';
import { Router } from '@angular/router';
import { Enterprise } from '../../../models/components/enterprise';
import { AppuserService } from '../../../services/components/appuser.service';

@Component({
  selector: 'app-add-employees-modal',
  templateUrl: './add-employees-modal.component.html',
  styleUrl: './add-employees-modal.component.css'
})
export class AddEmployeesModalComponent implements OnInit {

  authService = inject(AuthenticationService);
  enterpriseService = inject(EnterpriseService);
  employeeService = inject(EmployeeService);
  router = inject(Router);
  appuserService = inject(AppuserService);

  //#region Labels
  general_information_employee: string = GENERAL_INFORMATION_EMPLOYEE;
  general_information_user: string = GENERAL_INFORMATION_USER;
  update_information_employee: string = UPDATE_INFORMATION_CUSTOMER;

  register_button: string = REGISTER_BUTTON;
  update_button: string = UPDATE_BUTTON;
  abort_button: string = ABORT_BUTTON;
  isUpdate: boolean = false;
  //#endregion

  //#region Declarations
  personForm!: FormGroup;
  userForm!: FormGroup;
  // Process roles excluding 'SuperAdmin' and applying translations
  roles = Object.entries(Roles)
    .filter(([key, value]) => !isNaN(Number(value)) && value !== Roles.SuperAdmin) // Exclude reverse mappings and SuperAdmin
    .map(([key, value]) => ({ key: Number(value), value: ROLE_TRANSLATIONS[Number(value)] || key }));

  userRoleSelected: boolean = false;
  allBanks = Object.values(BANKS_TN);
  allGovTn = Object.values(GOV_TN);

  inputdata!: any | null;
  inputdataUser!: any | null;
  inputType: string = '';
  isCheckedForIsActive: boolean = false;

  allSites: Site[] = [];

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  //#endregion

  //#region constructor
  /**
   *
   */
  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private accountService: AccountService,
    public dialogRef: MatDialogRef<AddEmployeesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }
  //#endregion

  ngOnInit(): void {
    this.inputType = this.data.inputType;
    console.log("INPUT TYPE OF THE TRANSACTION: ", this.inputType);

    if (this.inputType === 'updatePerson') {
      this.inputdata = this.data.person;
      this.isUpdate = true;
      console.log("PERSON TO UPDATE : ", this.data.person);
      this.initializeForms();
      this.patchFormValues();
    } else if (this.inputType === 'updateAppUser') {
      this.inputdata = this.data.person;
      this.inputdataUser = this.data.appuser;
      this.isUpdate = true;
      this.initializeForms();
      this.patchFormValues();

    } else if (this.inputType === 'addPerson' || this.inputType === 'addAppUser') {
      this.isUpdate = false;
      this.initializeForms();
    }

  }

  initializeForms() {
    if (this.inputType === 'addPerson' || this.inputType === 'updatePerson') {
      console.log('IN METHOD initializeForms and inputType is : ', this.inputType);
      this.createPersonForm();
      this.listenForRoleChanges();
      this.roles = this.getPersonRoles();
    }

    if (this.inputType === 'addAppUser' || this.inputType === 'updateAppUser') {
      console.log('IN METHOD initializeForms and inputType is : ', this.inputType);
      this.createUserForm();
      this.createPersonForm();
      this.listenForRoleChanges();
      this.userRoleSelected = true;
      this.roles = this.getUserRoles();
    }
  }


  createPersonForm() {
    this.personForm = this.fb.group({
      //Person
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      birthdate: ['', Validators.required],
      cin: ['', Validators.required],
      idcnss: ['', Validators.required],
      role: [''],
      address: [''],
      birthtown: ['', Validators.required],
      hiredate: ['', Validators.required],
      firedate: [''],
      selectedRole: [''],
      bankname: [''],
      bankaccount: [''],
      phonenumber: ['', Validators.required]
    });
  }

  createUserForm() {
    this.userForm = this.fb.group({
      // User App
      login: ['', Validators.required],
      email: ['', Validators.required],
      defaultsite: ['', Validators.required],
      isactive: [true, ''],
      password: [{ value: '', disabled: this.inputType === 'updateAppUser' }, Validators.required],
    });
    this.getEnterpriseInfos();
  }

  patchFormValues() {
    const infinityDate = new Date('9999-12-31T23:59:59.999Z');
    if (this.inputType === 'updatePerson') {
      this.personForm.patchValue({
        firstname: this.inputdata.firstname || '',
        lastname: this.inputdata.lastname || '',
        // birthdate: this.inputdata.birthdate && this.inputdata.birthdate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.birthdate)
        //   : null,
        birthdate: this.inputdata.birthdate || '',
        bankname: this.inputdata.bankname || '',
        birthtown: Number(this.inputdata.birthtown) || '',
        bankaccount: this.inputdata.bankaccount || '',
        phonenumber: this.inputdata.phonenumber,
        address: this.inputdata.address || '',
        cin: this.inputdata.cin || '',
        idcnss: this.inputdata.idcnss || '',
        // hiredate: this.inputdata.hiredate && this.inputdata.hiredate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.hiredate)
        //   : null,
        hiredate: this.inputdata.hiredate || '',
        // firedate: this.inputdata.firedate && this.inputdata.firedate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.firedate)
        //   : null,
        firedate: this.inputdata.firedate || '',
        selectedRole: this.inputdata.role || ''
      });
    } else if (this.inputType === 'updateAppUser') {
      this.personForm.patchValue({
        firstname: this.inputdata.person.firstname || '',
        lastname: this.inputdata.person.lastname || '',
        // birthdate: this.inputdata.person.birthdate && this.inputdata.person.birthdate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.person.birthdate)
        //   : null,
        birthdate: this.inputdata.person.birthdate,
        bankname: this.inputdata.person.bankname || '',
        bankaccount: this.inputdata.person.bankaccount || '',
        phonenumber: this.inputdata.person.phonenumber,
        birthtown: Number(this.inputdata.person.birthtown) || '',
        address: this.inputdata.person.address || '',
        cin: this.inputdata.person.cin || '',
        idcnss: this.inputdata.person.idcnss || '',
        updatedate: new Date(),
        // Ensure hiredate and firedate are in Date format or fallback to infinityDate
        // hiredate: this.inputdata.person.hiredate && this.inputdata.person.hiredate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.person.hiredate)
        //   : null,
        hiredate: this.inputdata.person.hiredate || '',
        // firedate: this.inputdata.person.firedate && this.inputdata.person.firedate !== infinityDate.toISOString()
        //   ? new Date(this.inputdata.person.firedate)
        //   : null,
        firedate: this.inputdata.person.firedate ? this.inputdata.person.firedate : infinityDate.toISOString(),
        selectedRole: this.inputdata.person.role || ''
      });
      this.userForm.patchValue({
        login: this.inputdataUser.login || '',
        email: this.inputdataUser.email || '',
        isactive: this.inputdataUser.isactive || false,
        defaultsite: this.inputdataUser.defaultsite
      });
    }
    this.personForm.updateValueAndValidity();
    // this.userForm.updateValueAndValidity();
  }


  // checkRole() {
  //   const selectedRole = this.personForm.get('selectedRole')!.value;
  //   this.userRoleSelected = [20, 30, 60].includes(selectedRole);
  // }

  listenForRoleChanges() {
    const selectedRole = this.personForm.get('selectedRole')?.value;
    if ([20, 30, 60].includes(selectedRole)) {
      this.userRoleSelected = true;
      this.scrollToElement('#userDetailsCard', -100); // Adjust offset as needed
    } else {
      // If no specific role is selected, you can reset user-specific form fields here (optional)
      this.personForm.reset();
    }
  }


  checkRole() {
    const selectedRole = this.personForm.get('selectedRole')!.value;
    this.userRoleSelected = [20, 30, 60].includes(selectedRole);
    if (this.userRoleSelected) {
      this.scrollToElement('#userDetailsCard', -100);
    }
  }


  createPersonInstance(formValues: any): Person {
    const infinityDate = new Date('9999-12-31T23:59:59.999Z');
    let _id = 0;
    let _updateDate!: Date | null;
    let _creationDate!: Date | null;
    if (this.inputType == 'updatePerson' || this.inputType == 'updateAppUser') {
      _id = this.inputdata.id;
      _updateDate = new Date();
      _creationDate = this.inputdata.creationdate || null;
    } else {
      _creationDate = new Date();
      _updateDate = new Date();
    }
    return {
      id: _id,
      firstname: formValues.firstname,
      lastname: formValues.lastname,
      guid: '',
      /*this.inputdata.person.birthdate && this.inputdata.person.birthdate !== infinityDate.toISOString()
        ? new Date(this.inputdata.person.birthdate)
        : null,*/
      birthdate: formValues.birthdate && formValues.birthdate !== infinityDate.toISOString()
        ? new Date(formValues.birthdate)
        : null,
      birthtown: formValues.birthtown.toString(),
      bankname: formValues.bankname,
      bankaccount: formValues.bankaccount,
      phonenumber: formValues.phonenumber,
      address: formValues.address,
      cin: formValues.cin,
      idcnss: formValues.idcnss,
      hiredate: formValues.hiredate && formValues.hiredate !== infinityDate.toISOString()
        ? new Date(formValues.hiredate)
        : null,
      firedate: formValues.firedate && formValues.firedate !== infinityDate.toISOString()
        ? new Date(formValues.firedate)
        : null,
      creationdate: _creationDate,
      isdeleted: false,
      isappuser: false,
      updatedate: _updateDate,
      role: Number(formValues.selectedRole),
      updatedby: Number(this.authService.getUserDetail()!.id)
    };
  }

  createAppUserInstance(formValues: any, person: Person): AppUser {
    let _id = 0;
    if (this.inputType == 'updateAppUser') {
      _id = this.inputdataUser.id;
      // Set isappuser to true
      person.isappuser = true;
    }
    console.log("_id in function createAppUserInstance(formValues: any, person: Person): ", _id);
    let _password = '';
    if (formValues.password == isNaN) {
      _password = ''
    } else {
      _password = formValues.password;
    }
    console.log('Default site value:', formValues.defaultsite);
    let _idEnterprise: any;
    if (this.authService.isLoggedIn()) {
      _idEnterprise = Number(this.authService.getUserDetail()?.enterpriseId);
    } else {
      this.router.navigateByUrl('/login');
      this.toastr.info('Vous devez vous connectez')
    }
    return {
      id: _id,
      email: formValues.email,
      login: formValues.login,
      isactive: formValues.isactive,
      defaultsite: formValues.defaultsite,
      identerprise: _idEnterprise,
      password: _password,
      person: person,
    };
  }

  // onSubmit() {
  //   let formValues: any;
  //   let person: any;
  //   if (this.personForm.valid) {

  //     if (this.inputType === 'addPerson' || this.inputType === 'updatePerson') {
  //       formValues = this.personForm.value;
  //       person = this.createPersonInstance(formValues);
  //       //console.log("AFFECTATIONS DE FORMVALUES IN addPerson and updatePerson", formValues);
  //     } else if (this.inputType === 'addAppUser' || this.inputType === 'updateAppUser') {
  //       formValues = this.personForm.value;
  //       person = this.createPersonInstance(formValues);
  //       formValues = this.userForm.value;
  //       //console.log("AFFECTATIONS DE FORMVALUES IN addAppUser and updateAppUser", formValues);
  //     }

  //     //const person = this.createPersonInstance(formValues);

  //     console.log("ON SUBMIT Method : const formvalues :", formValues);
  //     console.log("ON SUBMIT Method : const person :", person);

  //     if (this.inputType === 'addPerson' || this.inputType === 'addAppUser') {
  //       console.log("this.handleAddOperation(formValues, person);")
  //       this.handleAddOperation(formValues, person);
  //     } else if (this.inputType === 'updatePerson' || this.inputType === 'updateAppUser') {
  //       console.log("this.handleUpdateOperation(formValues, person);")
  //       console.log("this.handleUpdateOperation(formValues, person); THE PERSON IS : ", person)
  //       console.log("this.handleUpdateOperation(formValues, person); THE FORMAVALUES IS : ", formValues)
  //       this.handleUpdateOperation(formValues, person);
  //     }
  //   } else {
  //     this.toastr.warning("Please validate the input fields first!");
  //   }
  // }

  /**
   * Try to fix isappuser witch did not work
   */
  onSubmit() {
    let formValues: any;
    let person: any;
    if (this.personForm.valid) {

      if (this.inputType === 'addPerson' || this.inputType === 'updatePerson') {
        /**
         * Handle the case where isAppUser is false
         * Handle Creating instance Person from FormValues
         */
        formValues = this.personForm.value;
        person = this.createPersonInstance(formValues);
        /**
         * Handle the Add an the Update of the person separately
         */
        if (this.inputType === 'addPerson') {
          console.log("this.handleAddOperation(formValues, person);")
          this.handleAddOperation(formValues, person);
        } else if (this.inputType === 'updatePerson') {
          this.handleUpdateOperation(formValues, person);
        }
      } else if (this.inputType === 'addAppUser' || this.inputType === 'updateAppUser') {
        /**
        * Handle the case where isAppUser is true
        * Handle Creating instance AppUser from FormValues
        */
        formValues = this.personForm.value;
        person = this.createPersonInstance(formValues);
        person.isappuser = true;
        formValues = this.userForm.value;
        /**
         * Handle the Add an the Update of the AppUser separately
         */
        if (this.inputType === 'addAppUser') {
          console.log("this.handleAddOperation(formValues, person);")
          this.handleAddOperation(formValues, person);
        } else if (this.inputType === 'updateAppUser') {
          this.handleUpdateOperation(formValues, person);
        }
      }

      //const person = this.createPersonInstance(formValues);

      console.log("ON SUBMIT Method : const formvalues :", formValues);
      console.log("ON SUBMIT Method : const person :", person);

      // if (this.inputType === 'addPerson' || this.inputType === 'addAppUser') {
      //   console.log("this.handleAddOperation(formValues, person);")
      //   this.handleAddOperation(formValues, person);
      // } else if (this.inputType === 'updatePerson' || this.inputType === 'updateAppUser') {
      //   console.log("this.handleUpdateOperation(formValues, person);")
      //   console.log("this.handleUpdateOperation(formValues, person); THE PERSON IS : ", person)
      //   console.log("this.handleUpdateOperation(formValues, person); THE FORMAVALUES IS : ", formValues)
      //   this.handleUpdateOperation(formValues, person);
      // }
    } else {
      this.toastr.warning("Please validate the input fields first!");
    }
  }

  handleAddOperation(formValues: any, person: Person) {
    console.log('person.role:', person.role); // Check the value and type
    const requiresUser = [20, 30, 60].includes(person.role);
    console.log("handleAddOperation(formValues: any, person: Person) : requiresUser => person.role", person.role);
    const appuser = requiresUser ? this.createAppUserInstance(formValues, person) : null;

    this.addEmployeeOrPerson(appuser, person);
  }

  handleUpdateOperation(formValues: any, person: Person) {
    console.log('person.role:', person.role); // Check the value and type
    const requiresUser = person && [20, 30, 60].includes(person.role);

    if (requiresUser) {
      const appUser = this.createAppUserInstance(formValues, person);
      this.updateEmployeeOrPerson(appUser, null);
    } else {
      const person = this.createPersonInstance(formValues);
      this.updateEmployeeOrPerson(null, person);
    }

    // const appuser = requiresUser ? this.createAppUserInstance(formValues, person) : null;
    // console.log("METHOD handleUpdateOperation");
    // console.log("METHOD handleUpdateOperation const requireUser : ", requiresUser);
    // console.log("METHOD handleUpdateOperation const appuser : ", appuser);
    // this.updateEmployeeOrPerson(appuser, null);
  }

  getUserRoles(): Array<{ key: number, value: string }> {
    return Object.entries(Roles)
      .filter(([key, value]) =>
        !isNaN(Number(value)) &&
        [Roles.Admin, Roles.User, Roles.InvoiceAgent].includes(Number(value)) &&
        value !== Roles.SuperAdmin // Exclude SuperAdmin
      )
      .map(([key, value]) => ({ key: Number(value), value: ROLE_TRANSLATIONS[Number(value)] || key }));
  }

  getPersonRoles(): Array<{ key: number, value: string }> {
    return Object.entries(Roles)
      .filter(([key, value]) =>
        !isNaN(Number(value)) &&
        ![Roles.Admin, Roles.User, Roles.InvoiceAgent].includes(Number(value)) &&
        value !== Roles.SuperAdmin // Exclude SuperAdmin
      )
      .map(([key, value]) => ({ key: Number(value), value: ROLE_TRANSLATIONS[Number(value)] || key }));
  }




  addEmployeeOrPerson(userToSend: AppUser | null, personToSend: Person): void {
    if (userToSend) {
      console.log("Sending User with Person:", userToSend);

      this.accountService.RegisterEmployee(userToSend).subscribe({
        next: (response) => {
          this.toastr.success('Successfully registered user: ' + response.email);
          this.dialogRef.close('addedUser');
        },
        error: (error) => {
          console.error('Error registering user', error);
          this.toastr.error('Failed to register user.');
        }
      });
    } else {
      console.log("Sending Person only:", personToSend);
      this.employeeService.AddEmployee(personToSend).subscribe({
        next: (response) => {
          this.toastr.success('Successfully added person: ' + response.firstname);
          this.dialogRef.close('addedPerson');
        },
        error: (error) => {
          console.error('Error adding person', error);
          this.toastr.error('Failed to add person.');
        }
      });
    }
  }

  updateEmployeeOrPerson(userToUpdate: AppUser | null, personToUpdate: Person | null) {
    if (userToUpdate) {
      console.log("Updating User with Person:", userToUpdate);

      this.appuserService.Put(userToUpdate.id, userToUpdate).subscribe({
        next: (response) => {
          this.toastr.success('Successfully Updated user: ' + response.email);
          this.dialogRef.close('updatedUser');
        },
        error: (error) => {
          console.error('Error updating user', error);
          this.toastr.error('Failed to update user.');
        }
      });
    } else if (personToUpdate) {
      console.log("Updating Person only:", personToUpdate);
      this.employeeService.Put(personToUpdate.id, personToUpdate).subscribe({
        next: (response) => {
          this.toastr.success('Successfully updated person: ' + response.firstname);
          this.dialogRef.close('updatedPerson');
        },
        error: (error) => {
          console.error('Error adding person', error);
          this.toastr.error('Failed to update person.');
        }
      });
    } else {
      this.toastr.error('Person and AppUser are Both NULL');
    }
  }



  onAbort() {
    this.dialogRef.close();
  }



  onRoleSelected() {
    const selectedRole = this.personForm.get('selectedRole')?.value;
    if ([20, 30, 60].includes(selectedRole)) {
      this.userRoleSelected = true;
      this.scrollToElement('#userDetailsCard', -100); // Adjust offset as needed
    }
  }

  scrollToElement(selector: string, offset: number) {
    const element = this.scrollContainer.nativeElement.querySelector(selector);
    if (element) {
      const yOffset = offset;
      const y = element.getBoundingClientRect().top + this.scrollContainer.nativeElement.scrollTop + yOffset;
      this.scrollContainer.nativeElement.scrollTo({ top: y, behavior: 'smooth' });
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
        // // Ensure the first site is set as the default value
        // if (this.allSites.length > 0) {
        //   this.userForm.patchValue({ defaultsite: this.allSites[0].id });
        // }
      }, error: (error) => {
        this.toastr.error(error.message);
        this.toastr.show("Réessayer plus tard");
      }
    });
  }

}
