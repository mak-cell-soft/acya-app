import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { ToastrService } from 'ngx-toastr';
import { SocietyPrefixes_FR, SupplierCategories_FR } from '../../../shared/constants/list_of_constants';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';
import { fiscalMatriculeValidator } from '../../../shared/validators/taxRegistrationValidator';
import { UPDATE_BUTTON } from '../../../shared/Text_Buttons';

@Component({
    selector: 'app-provider-edit-modal',
    templateUrl: './provider-edit-modal.component.html',
    styleUrls: ['./provider-edit-modal.component.css']
})
export class ProviderEditModalComponent implements OnInit {
    providerForm!: FormGroup;
    allPrefixes = Object.values(SocietyPrefixes_FR);
    allProvidersCategories = Object.values(SupplierCategories_FR);
    allBanks = BANKS_TN;
    update_button: string = UPDATE_BUTTON;

    constructor(
        public dialogRef: MatDialogRef<ProviderEditModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { supplier: CounterPart },
        private fb: FormBuilder,
        private counterPartService: CounterpartService,
        private toastr: ToastrService
    ) { }

    ngOnInit(): void {
        this.createForm();
        this.patchValues();
    }

    createForm(): void {
        this.providerForm = this.fb.group({
            prefix: ['', Validators.required],
            name: ['', Validators.required],
            description: ['', Validators.required],
            taxRegistration: ['', [fiscalMatriculeValidator()]],
            email: ['', Validators.email],
            address: ['', Validators.required],
            category: ['', Validators.required],
            representedBySurname: ['', Validators.required],
            representedByName: ['', Validators.required],
            phoneOne: ['', Validators.required],
            phoneTwo: ['', Validators.required],
            bank: ['', Validators.required],
            bankAccountNumber: ['', Validators.required]
        });
    }

    patchValues(): void {
        const supplier = this.data.supplier;
        this.providerForm.patchValue({
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

    onSave(): void {
        if (this.providerForm.valid) {
            const formValues = this.providerForm.value;
            const updatedSupplier: CounterPart = {
                ...this.data.supplier,
                prefix: formValues.prefix,
                name: formValues.name,
                description: formValues.description,
                taxregistrationnumber: formValues.taxRegistration,
                email: formValues.email,
                address: formValues.address,
                jobtitle: formValues.category.toString(),
                firstname: formValues.representedBySurname,
                lastname: formValues.representedByName,
                phonenumberone: formValues.phoneOne,
                phonenumbertwo: formValues.phoneTwo,
                bankname: formValues.bank,
                bankaccountnumber: formValues.bankAccountNumber,
                updatedate: new Date(),
                updatedbyid: 1 // Default as per original code
            };

            this.counterPartService.Put(updatedSupplier.id, updatedSupplier).subscribe({
                next: (response) => {
                    this.toastr.success(response.name, 'Mis à jour');
                    this.dialogRef.close(true);
                },
                error: (error) => {
                    const errorMessage = error.error?.message || 'Erreur lors de la mise à jour';
                    this.toastr.warning(errorMessage, 'Erreur');
                }
            });
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }
}
