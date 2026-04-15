import { Component, Inject, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AppVariableService } from '../../../../services/configuration/app-variable.service';
import { Document } from '../../../../models/components/document';
import { AppVariable } from '../../../../models/configuration/appvariable';
import { HoldingTaxe } from '../../../../models/components/holdingtax';
import { Store, select } from '@ngrx/store';
import { loadAppVariables } from '../../../../store/actions/appvariable.actions';
import { selectAppVariablesByNature } from '../../../../store/selectors/appvariable.selectors';

@Component({
  selector: 'app-withholding-tax-modal',
  templateUrl: './withholding-tax-modal.component.html',
  styleUrls: ['./withholding-tax-modal.component.css']
})
export class WithholdingTaxModalComponent implements OnInit {
  appVariableService = inject(AppVariableService);
  store = inject(Store);

  availableRSRates: AppVariable[] = [];
  selectedRate: AppVariable | null = null;
  reference: string = '';
  issigned: boolean = false;
  
  // Totals for display
  totalTtc: number = 0;
  rsAmount: number = 0;
  netPayable: number = 0;

  constructor(
    public dialogRef: MatDialogRef<WithholdingTaxModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { document: Document }
  ) {
    this.totalTtc = this.data.document.total_net_ttc || 0;
    if (this.data.document.holdingtax) {
      this.reference = this.data.document.holdingtax.reference || '';
      this.issigned = this.data.document.holdingtax.issigned || false;
    }
  }

  ngOnInit(): void {
    this.loadRSRates();
  }

  loadRSRates() {
    this.store.dispatch(loadAppVariables({ nature: 'RS' }));

    this.store.pipe(select(selectAppVariablesByNature('RS'))).subscribe((rates) => {
      this.availableRSRates = rates;
      // If document already has RS, try to match it
      if (this.data.document.holdingtax && this.data.document.holdingtax.taxpercentage) {
        this.selectedRate = this.availableRSRates.find(r => Number(r.value) === this.data.document.holdingtax?.taxpercentage) || null;
        this.calculate();
      }
    });
  }

  onRateChange() {
    this.calculate();
  }

  calculate() {
    if (this.selectedRate) {
      const percentage = Number(this.selectedRate.value) || 0;
      this.rsAmount = (this.totalTtc * percentage) / 100;
      this.netPayable = this.totalTtc - this.rsAmount;
    } else {
      this.rsAmount = 0;
      this.netPayable = this.totalTtc;
    }
  }

  onConfirm() {
    const holdingTax = new HoldingTaxe();
    if (this.data.document.holdingtax) {
        holdingTax.id = this.data.document.holdingtax.id;
    }
    holdingTax.documentid = this.data.document.id;
    holdingTax.description = this.selectedRate?.name || 'Retenue à la source';
    holdingTax.taxpercentage = this.selectedRate ? Number(this.selectedRate.value) : 0;
    holdingTax.taxvalue = this.rsAmount;
    holdingTax.reference = this.reference;
    holdingTax.issigned = this.issigned;
    holdingTax.newamountdocvalue = this.netPayable;
    holdingTax.updatedbyid = this.data.document.updatedbyid;
    

    this.dialogRef.close(holdingTax);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
