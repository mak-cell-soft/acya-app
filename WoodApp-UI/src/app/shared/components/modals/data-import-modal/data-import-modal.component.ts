import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImportService, ImportReport } from '../../../../services/components/import.service';
import { AuthenticationService } from '../../../../services/components/authentication.service';
import { ToastrService } from 'ngx-toastr';

export interface ImportModalData {
  type: 'article' | 'customer' | 'provider';
}

@Component({
  selector: 'app-data-import-modal',
  templateUrl: './data-import-modal.component.html',
  styleUrls: ['./data-import-modal.component.scss']
})
export class DataImportModalComponent implements OnInit {
  importTypeLabel = '';
  fileFormat = '.xlsx / .csv';
  isDragging = false;
  selectedFile: File | null = null;
  isLoading = false;
  report: ImportReport | null = null;

  constructor(
    public dialogRef: MatDialogRef<DataImportModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImportModalData,
    private importService: ImportService,
    private authService: AuthenticationService,
    private toastr: ToastrService
  ) {
    this.setLabels();
  }

  ngOnInit(): void {}

  setLabels() {
    switch (this.data.type) {
      case 'article': this.importTypeLabel = 'articles'; break;
      case 'customer': this.importTypeLabel = 'clients'; break;
      case 'provider': this.importTypeLabel = 'fournisseurs'; break;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
    }
  }

  downloadTemplate(format: 'xlsx' | 'csv') {
    this.toastr.info('Préparation du modèle...', 'Info');
    const fileName = `template_${this.data.type}.${format}`;
    const url = `/assets/templates/${fileName}`;
    window.open(url, '_blank');
  }

  onImport() {
    if (!this.selectedFile) {
      this.toastr.error('Veuillez sélectionner un fichier.');
      return;
    }

    const user = this.authService.getUserDetail();
    if (!user || !user.id || !user.enterpriseId) {
      this.toastr.error('Session utilisateur invalide.');
      return;
    }

    this.isLoading = true;
    const obs = this.data.type === 'article' 
      ? this.importService.importArticles(this.selectedFile, user.id, user.enterpriseId)
      : this.importService.importCounterParts(this.selectedFile, this.data.type.toUpperCase(), user.id, user.enterpriseId);

    obs.subscribe({
      next: (res) => {
        this.report = res;
        this.isLoading = false;
        if (res.successCount > 0 && res.errors.length === 0) {
          this.toastr.success(`${res.successCount} enregistrements importés avec succès.`);
        } else if (res.successCount > 0) {
          this.toastr.warning(`${res.successCount} réussis, ${res.errors.length} erreurs.`);
        } else {
          this.toastr.error('L\'importation a échoué pour tous les enregistrements.');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Import error:', err);
        this.toastr.error('Une erreur technique est survenue.');
      }
    });
  }

  onClose() {
    this.dialogRef.close(this.report && this.report.successCount > 0 ? true : false);
  }
}
