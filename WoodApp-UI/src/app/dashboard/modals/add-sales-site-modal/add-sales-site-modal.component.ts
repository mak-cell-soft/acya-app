import { Component, Inject, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { REGISTER_BUTTON, ABORT_BUTTON } from '../../../shared/Text_Buttons';
import {
  MAT_DIALOG_TITLE_MODAL, MAT_LABEL_CODE_POST, MAT_LABEL_GOV, MAT_LABEL_SITE_NATURE,
  MAT_LABEL_TOWN, MAT_PLACEHOLDER_CODE_POST, MAT_PLACEHOLDER_TOWN, GOV_TN, SITE_NATURE
} from '../../../shared/constants/modals/sales_site_modal';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Site } from '../../../models/components/sites';


@Component({
  selector: 'app-add-sales-site-modal',
  templateUrl: './add-sales-site-modal.component.html',
  styleUrl: './add-sales-site-modal.component.css'
})
export class AddSalesSiteModalComponent implements OnInit {

  fb = inject(FormBuilder);
  //#region Label Constants
  register_button_label: string = REGISTER_BUTTON;
  abort_button_label: string = ABORT_BUTTON;

  mat_dialog_title_modal: string = MAT_DIALOG_TITLE_MODAL;
  mat_label_code_post: string = MAT_LABEL_CODE_POST;
  mat_label_gov: string = MAT_LABEL_GOV;
  mat_label_site_nature: string = MAT_LABEL_SITE_NATURE;
  mat_label_town: string = MAT_LABEL_TOWN;
  mat_placeholder_code_post: string = MAT_PLACEHOLDER_CODE_POST;
  mat_placeholder_town: string = MAT_PLACEHOLDER_TOWN;

  govOptions = GOV_TN;
  siteOptions = SITE_NATURE;

  inputdata!: any | null;


  //#endregion

  sitesForm!: FormGroup;


  constructor(
    public dialogRef: MatDialogRef<AddSalesSiteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  ngOnInit(): void {
    this.inputdata = this.data.input;
    this.createForm();
  }

  createForm() {
    this.sitesForm = this.fb.group({
      codepost: ['', Validators.required],
      town: ['', Validators.required],
      isForsale: [true, Validators.required],
      gov: [this.govOptions[0].key, Validators.required]
    });
  }

  createSiteInstance(): Site {

    let formValues = this.sitesForm.value;
    return {
      id: 0,
      codepost: formValues.codepost,
      address: formValues.town,
      isForsale: formValues.isForsale,
      gov: formValues.gov,
      isdeleted: false,
      enterpriseid: 0
    }
  }


  register() {
    if (this.inputdata === 'first-creation') {
      this.dialogRef.close(this.createSiteInstance());
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
