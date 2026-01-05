import { Component, inject, Inject, OnInit } from '@angular/core';
import { ERROR_ADD_CATEGORY, ERROR_ADD_SUB_CATEGORY, MAT_DIALOG_TITLE_MODAL, MAT_DIALOG_TITLE_MODAL_UPDATE_SUB_CATEGORIES, MAT_LABEL_DESIGNATION as MAT_LABEL_DESCRIPTION, MAT_LABEL_REFRENCE, SUCCESS_ADD_CATEGORY, SUCCESS_ADD_SUB_CATEGORY, WARNING_ADD_CATEGORY } from '../../../shared/constants/modals/categories_modal';
import { ADD_UNDER_CATEGORY_BUTTON, REGISTER_BUTTON, ABORT_BUTTON } from '../../../shared/Text_Buttons';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SubCategory } from '../../../models/configuration/category';
import { ToastrService } from 'ngx-toastr';
import { SubCategoryService } from '../../../services/configuration/sub-category.service';
import { CategoryService } from '../../../services/configuration/category.service';
import { AuthenticationService } from '../../../services/components/authentication.service';


@Component({
  selector: 'app-add-sub-categories-modal',
  templateUrl: './add-sub-categories-modal.component.html',
  styleUrl: './add-sub-categories-modal.component.css'
})



export class AddSubCategoriesModalComponent implements OnInit {


  authService = inject(AuthenticationService);

  //#region Label & Constants
  mat_dialog_title_modal_update_sub_categories: string = MAT_DIALOG_TITLE_MODAL_UPDATE_SUB_CATEGORIES;
  mat_label_reference: string = MAT_LABEL_REFRENCE;
  mat_label_description: string = MAT_LABEL_DESCRIPTION;

  add_under_category_button: string = ADD_UNDER_CATEGORY_BUTTON;
  register_button: string = REGISTER_BUTTON;
  abort_button: string = ABORT_BUTTON;
  //#endregion

  //#region Output Messages
  success_add_sub_category: string = SUCCESS_ADD_SUB_CATEGORY;
  error_add_sub_category: string = ERROR_ADD_SUB_CATEGORY;
  warning_add_category: string = WARNING_ADD_CATEGORY;
  //#endregion

  categoryForm!: FormGroup;
  inputdata: any;

  constructor(
    private fb: FormBuilder,
    private fb1: FormBuilder,
    private dialogRef: MatDialogRef<AddSubCategoriesModalComponent>,
    private toastr: ToastrService,
    private categoryService: CategoryService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.categoryForm = this.fb.group({
      reference: ['', Validators.required],
      description: ['', Validators.required],
      subcategories: this.fb1.array([])
    });

  }

  // ngOnInit(): void {
  //   if (this.authService.isLoggedIn()) {
  //     this.inputdata = this.data.category;
  //     this.categoryForm.patchValue({
  //       reference: this.inputdata.reference,
  //       description: this.inputdata.description
  //     });
  //     console.log("First Children Recieved: ", this.inputdata.firstchildren);
  //     this.setSubcategories(this.inputdata.firstchildren || []);
  //   }

  // }

  /**
   * ngOnInit with debug
   * 
   */

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.inputdata = this.data.category;
      this.categoryForm.patchValue({
        reference: this.inputdata.reference,
        description: this.inputdata.description
      });
      console.log("First Children Recieved: ", this.inputdata.firstchildren);
      this.setSubcategories(this.inputdata.firstchildren || []);
      console.log("Subcategories Form Array: ", this.subcategories); // Debugging line
    }
  }


  // ngOnInit(): void {
  //   if (this.authService.isLoggedIn()) {
  //     this.inputdata = this.data.category;
  //     this.categoryForm = this.fb.group({
  //       reference: [this.inputdata.reference, Validators.required],
  //       description: [this.inputdata.description, Validators.required],
  //       subcategories: this.fb1.array([])
  //     });
  //     this.setSubcategories(this.inputdata.firstchildren || []);
  //   }
  // }


  // setSubcategories(_subcategories: SubCategory[]): void {
  //   const subcategoryFGs = _subcategories.map(subcategory => this.fb1.group({
  //     subReference: [{ value: subcategory.reference, disabled: !subcategory.isNew }, Validators.required],
  //     subDescription: [{ value: subcategory.description, disabled: !subcategory.isNew }, Validators.required]
  //   }));
  //   const subcategoryFormArray = this.fb.array(subcategoryFGs);
  //   this.categoryForm.setControl('subcategories', subcategoryFormArray);
  // }

  setSubcategories(_subcategories: SubCategory[]): void {
    const subcategoryFGs = _subcategories.map(subcategory => this.fb1.group({
      subReference: [{ value: subcategory.reference, disabled: !subcategory.isNew }, Validators.required],
      subDescription: [{ value: subcategory.description, disabled: !subcategory.isNew }, Validators.required]
    }));
    const subcategoryFormArray = this.fb1.array(subcategoryFGs); // Use fb1 here
    this.categoryForm.setControl('subcategories', subcategoryFormArray);
  }

  get subcategories(): FormArray {
    return this.categoryForm.get('subcategories') as FormArray;
  }

  addSubcategory(): void {
    const newSubcategory = this.fb1.group({
      subReference: ['', Validators.required],
      subDescription: ['', Validators.required]
    });
    this.subcategories.push(newSubcategory);
  }

  removeSubcategory(index: number): void {
    this.subcategories.removeAt(index);
  }

  onSubmit(): void {
    const _userAppId = Number(this.authService.getUserDetail()?.id);
    if (this.categoryForm.valid) {
      // Filter to get only the new subcategories and create SubCategory objects
      const newSubcategories = this.subcategories.controls
        .filter(subcategory => subcategory.get('subReference')?.enabled == true)
        .map(subcategory => ({
          id: 0, // Assuming new subcategories have id 0
          reference: subcategory.get('subReference')?.value,
          description: subcategory.get('subDescription')?.value,
          creationdate: new Date(),
          updatedate: new Date(),
          isdeleted: false,
          updatedby: _userAppId,
          idparent: this.inputdata.id,
          isNew: true,
          editing: false
        }));

      // Prepare the payload
      const payload = {
        ...this.inputdata,
        firstchildren: newSubcategories
      };

      console.log("SEND PAYLOAD : ", payload)

      // Make the API call
      this.categoryService.Put(this.inputdata.id, payload).subscribe({
        next: (response) => {
          this.toastr.success(this.success_add_sub_category);
          this.categoryService.updateCategory(payload);
          this.dialogRef.close();
        },
        error: (error) => {
          this.toastr.error(this.error_add_sub_category);
        }
      });
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

}
