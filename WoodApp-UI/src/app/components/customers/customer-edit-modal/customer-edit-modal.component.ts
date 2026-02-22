import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CounterPart } from '../../../models/components/counterpart';
import { CounterpartService } from '../../../services/components/counterpart.service';
import { ToastrService } from 'ngx-toastr';
import { CounterPartActivities_FR, fullPrefixes_FR, SocietyPrefixes_FR, CustomerPrefixes_FR, CounterPartType_FR } from '../../../shared/constants/list_of_constants';
import { GOV_TN } from '../../../shared/constants/modals/sales_site_modal';
import { BANKS_TN } from '../../../shared/constants/modals/bank_modal';

@Component({
    selector: 'app-customer-edit-modal',
    templateUrl: './customer-edit-modal.component.html',
    styleUrls: ['./customer-edit-modal.component.css']
})
export class CustomerEditModalComponent implements OnInit {
    customerForm!: FormGroup;
    isSociety = false;
    allPrefixes = Object.values(fullPrefixes_FR);
    societyActivities = Object.values(CounterPartActivities_FR);
    gouvernorate = Object.values(GOV_TN);
    allBanks = Object.values(BANKS_TN);

    constructor(
        public dialogRef: MatDialogRef<CustomerEditModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { customer: CounterPart },
        private fb: FormBuilder,
        private counterPartService: CounterpartService,
        private toastr: ToastrService
    ) { }

    ngOnInit(): void {
        this.isSociety = this.isSocietyPrefix(this.data.customer.prefix);
        this.createForm();
        this.patchValues();
    }

    createForm(): void {
        this.customerForm = this.fb.group({
            selectedprefix: [this.data.customer.prefix, Validators.required],
            firstname: [this.data.customer.firstname, Validators.required],
            lastname: [this.data.customer.lastname, Validators.required],
            name: [this.data.customer.name],
            description: [this.data.customer.description],
            phonenumberone: [this.data.customer.phonenumberone],
            phonenumbertwo: [this.data.customer.phonenumbertwo],
            maximumdiscount: [this.data.customer.maximumdiscount],
            maximumsalesbar: [this.data.customer.maximumsalesbar],
            openingbalance: [this.data.customer.openingbalance || 0],
            address: [this.data.customer.address],
            gouvernorate: [this.data.customer.gouvernorate],
            cin: [this.data.customer.identitycardnumber],
            mfcode: [this.data.customer.taxregistrationnumber],
            patentecode: [this.data.customer.patentecode],
            activity: [Number(this.data.customer.jobtitle)],
            email: [this.data.customer.email],
            bank: [this.data.customer.bankname],
            bankaccount: [this.data.customer.bankaccountnumber],
            notes: [this.data.customer.notes],
            istypeboth: [this.data.customer.type === 'Both']
        });

        if (this.isSociety) {
            this.customerForm.get('name')?.setValidators(Validators.required);
            this.customerForm.get('description')?.setValidators(Validators.required);
        }
    }

    patchValues(): void {
        // Already handled in group initialization but keeping for consistency if needed
    }

    isSocietyPrefix(prefix: string): boolean {
        return SocietyPrefixes_FR.some(item => item.id === prefix);
    }

    onSave(): void {
        if (this.customerForm.valid) {
            const formValue = this.customerForm.value;
            const updatedCustomer: CounterPart = {
                ...this.data.customer,
                prefix: formValue.selectedprefix,
                firstname: formValue.firstname,
                lastname: formValue.lastname,
                name: formValue.name,
                description: formValue.description,
                phonenumberone: formValue.phonenumberone,
                phonenumbertwo: formValue.phonenumbertwo,
                maximumdiscount: formValue.maximumdiscount,
                maximumsalesbar: formValue.maximumsalesbar,
                openingbalance: formValue.openingbalance,
                address: formValue.address,
                gouvernorate: formValue.gouvernorate?.toString(),
                identitycardnumber: formValue.cin,
                taxregistrationnumber: formValue.mfcode,
                patentecode: formValue.patentecode,
                jobtitle: formValue.activity?.toString(),
                email: formValue.email,
                bankname: formValue.bank,
                bankaccountnumber: formValue.bankaccount,
                notes: formValue.notes,
                type: formValue.istypeboth ? 'Both' : 'Customer'
            };

            this.counterPartService.Put(updatedCustomer.id, updatedCustomer).subscribe({
                next: () => {
                    this.toastr.success('Client modifié avec succès');
                    this.dialogRef.close(true);
                },
                error: () => this.toastr.error('Erreur lors de la modification')
            });
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onUpperCase(event: Event, controlName: string): void {
        const input = event.target as HTMLInputElement;
        input.value = input.value.toUpperCase();
        this.customerForm.get(controlName)?.setValue(input.value);
    }
}
