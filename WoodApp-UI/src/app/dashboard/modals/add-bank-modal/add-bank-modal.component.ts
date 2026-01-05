import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { REGISTER_BUTTON, ABORT_BUTTON } from '../../../shared/Text_Buttons'
import {
  ERROR_ADD_BANK,
  MAT_DIALOG_TITLE_MODAL, MAT_LABEL_AGENCY, MAT_LABEL_BANK,
  MAT_LABEL_DESIGNATION, MAT_LABEL_IBAN, MAT_LABEL_RIB,
  MAT_PLACEHOLDER_AGENCY, MAT_PLACEHOLDER_BANK, MAT_PLACEHOLDER_IBAN, MAT_PLACEHOLDER_RIB,
  SUCCESS_ADD_BANK,
  WARNING_ADD_BANK
} from '../../../shared/constants/modals/bank_modal';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { Bank } from '../../../models/configuration/bank';
import { BankService } from '../../../services/configuration/bank.service';
import { ToastrService } from 'ngx-toastr';
import { addBank } from '../../../store/actions/bank.actions';
import { Store } from '@ngrx/store';

interface BankOption {
  key: string;
  value: string;
  logo: string;
}


@Component({
  selector: 'app-add-bank-modal',
  templateUrl: './add-bank-modal.component.html',
  styleUrls: ['./add-bank-modal.component.css']
})
export class AddBankModalComponent implements OnInit {

  //#region Labels Constants
  register_button_text: string = REGISTER_BUTTON;
  abort_button_text: string = ABORT_BUTTON;
  mat_dialog_title: string = MAT_DIALOG_TITLE_MODAL;
  mat_label_bank: string = MAT_LABEL_BANK;
  mat_label_agency: string = MAT_LABEL_AGENCY;
  mat_label_designation: string = MAT_LABEL_DESIGNATION;
  mat_label_rib: string = MAT_LABEL_RIB;
  mat_label_iban: string = MAT_LABEL_IBAN;
  mat_placeholder_agency: string = MAT_PLACEHOLDER_AGENCY;
  mat_placeholder_iban: string = MAT_PLACEHOLDER_IBAN;
  mat_placeholder_rib: string = MAT_PLACEHOLDER_RIB;
  mat_placeholder_bank: string = MAT_PLACEHOLDER_BANK;
  //#endregion

  //#region Output Messages
  success_add_bank: string = SUCCESS_ADD_BANK;
  error_add_bank: string = ERROR_ADD_BANK;
  warning_add_bank: string = WARNING_ADD_BANK;
  //#endregion


  bankForm: FormGroup;
  bankOptions = BANKS_TN;
  sortedBankOptions: BankOption[] = [];

  constructor(
    public dialogRef: MatDialogRef<AddBankModalComponent>,
    private fb: FormBuilder,
    private bankService: BankService,
    private store: Store,
    private toastr: ToastrService
  ) {
    this.bankForm = this.fb.group({
      reference: ['', Validators.required],
      designation: ['', Validators.required],
      agency: ['', Validators.required],
      rib: ['', Validators.required],
      iban: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.sortedBankOptions = this.bankOptions.sort((a, b) => a.key.localeCompare(b.key));
  }


  onBankChange(selectedBankKey: string): void {
    const selectedBank = this.bankOptions.find(bank => bank.key === selectedBankKey);
    if (selectedBank) {
      this.bankForm.get('designation')?.setValue(selectedBank.value);
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }


  onSubmit(): void {
    console.log('Form Valid:', this.bankForm.valid);
    console.log('Form Values:', this.bankForm.value);
    if (this.bankForm.valid) {
      const formValues = this.bankForm.value;
      const bank = new Bank();
      bank.id = 0; // Assuming it will be initialized in BackEnd
      bank.updatedby = 1;
      bank.reference = formValues.reference;
      bank.designation = formValues.designation;
      bank.agency = formValues.agency;
      bank.rib = formValues.rib;
      bank.iban = formValues.iban

      this.addBank(bank);
    } else {
      this.toastr.warning(this.warning_add_bank);
    }
  }

  // addBank(bank: Bank): void {
  //   if (bank) {
  //     this.bankService.AddBank(bank).subscribe({
  //       next: (response) => {
  //         this.toastr.success(this.success_add_bank);
  //         this.dialogRef.close(response);
  //       },
  //       error: (error) => {
  //         console.error('Error adding Bank', error);
  //         this.toastr.error(this.error_add_bank);
  //       }
  //     });
  //   } else {
  //     this.toastr.warning(this.warning_add_bank);
  //   }
  // }

  addBank(bank: Bank): void {
    if (bank) {
      this.store.dispatch(addBank({ bank: bank }));
      this.dialogRef.close(bank);
    } else {
      this.toastr.warning(this.warning_add_bank);
    }
  }
}
