import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatSelect } from '@angular/material/select';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ArticleService } from '../../../services/components/article.service';
import { AuthenticationService } from '../../../services/components/authentication.service';
import { AppuserService } from '../../../services/components/appuser.service';
import { InventoryService } from '../../../services/components/inventory.service';
import { Article } from '../../../models/components/article';
import { Merchandise } from '../../../models/components/merchandise';
import { Document, DocumentTypes } from '../../../models/components/document';
import { Site } from '../../../models/components/sites';
import { StockService } from '../../../services/components/stock.service';
import { SalessitesService } from '../../../services/components/salessites.service';
import { StockQuantity } from '../../../models/components/stock';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteModalComponent } from '../../../shared/components/modals/confirm-delete-modal/confirm-delete-modal.component';
import { GenericConfirmationModalComponent } from '../../../shared/components/modals/generic-confirmation-modal/generic-confirmation-modal.component';
import { AddLengthsModalComponent } from '../../../shared/components/modals/add-lengths-modal/add-lengths-modal.component';
import { ListOfLength } from '../../../models/components/listoflength';

@Component({
  selector: 'app-add-inventory',
  templateUrl: './add-inventory.component.html',
  styleUrl: './add-inventory.component.css'
})
export class AddInventoryComponent implements OnInit {
  toastr = inject(ToastrService);
  fb = inject(FormBuilder);
  articleService = inject(ArticleService);
  authService = inject(AuthenticationService);
  appUserService = inject(AppuserService);
  inventoryService = inject(InventoryService);
  siteService = inject(SalessitesService);
  stockService = inject(StockService);
  router = inject(Router);
  dialog = inject(MatDialog);

  @ViewChild('articleSelect') articleSelect!: MatSelect;

  inventoryForm!: FormGroup;
  merchandiseForm!: FormGroup;
  searchControl = new FormControl('');
  
  articles: Article[] = [];
  filteredArticles: Article[] = [];
  allSites: Site[] = [];
  allStocks: StockQuantity[] = [];
  packageReferences: string[] = [];
  selectedArticle!: Article | null;
  isArticleTypeWood = false;
  SalesSite!: Site;
  userconnected = this.authService.getUserDetail();

  displayedColumns = ['index', 'article', 'quantity', 'reference', 'actions'];
  merchandiseList = new MatTableDataSource<Merchandise>([]);

  responseFromModalLengths!: ListOfLength[];
  responseFromModalTotQuantity!: number;

  ngOnInit(): void {
    this.createForms();
    this.loadData();
  }

  createForms() {
    this.inventoryForm = this.fb.group({
      siteId: [null, Validators.required],
      description: ['']
    });

    this.merchandiseForm = this.fb.group({
      quantity: ['', Validators.required],
      reference: ['', Validators.required],
      description: ['']
    });

    // When site changes, reload stocks and clear current inventory list
    this.inventoryForm.get('siteId')?.valueChanges.subscribe(siteId => {
      if (!siteId) {
        this.SalesSite = null!;
        this.merchandiseList.data = [];
        return;
      }

      const site = this.allSites.find(s => s.id === siteId);
      if (!site) return;

      // If list is not empty, ask for confirmation
      if (this.merchandiseList.data.length > 0) {
        const dialogRef = this.dialog.open(GenericConfirmationModalComponent, {
          width: '400px',
          data: {
            title: 'Changement de Site',
            message: 'Changer de site videra votre liste d\'articles actuelle. Voulez-vous continuer ?',
            confirmText: 'Changer et Vider',
            cancelText: 'Annuler',
            icon: 'warning',
            color: 'warn'
          }
        });

        dialogRef.afterClosed().subscribe(confirmed => {
          if (confirmed) {
            this.SalesSite = site;
            this.loadStocks(site);
            this.merchandiseList.data = [];
          } else {
            // Revert selection silently by disabling emitEvent to avoid infinite loop
            this.inventoryForm.get('siteId')?.setValue(this.SalesSite?.id, { emitEvent: false });
          }
        });
      } else {
        this.SalesSite = site;
        this.loadStocks(site);
      }
    });
  }

  loadData() {
    this.articleService.GetAll().subscribe({
      next: (res) => {
        this.articles = res;
        this.filteredArticles = res;
        this.searchControl.valueChanges.subscribe(val => {
          const filterValue = (val || '').toLowerCase();
          this.filteredArticles = this.articles.filter(a => 
            a.reference.toLowerCase().includes(filterValue) || 
            (a.description && a.description.toLowerCase().includes(filterValue))
          );
        });
      }
    });

    this.siteService.GetAll().subscribe({
      next: (res) => {
        this.allSites = res;
      }
    });
  }

  loadStocks(site: Site) {
    this.stockService.getBySite(site).subscribe((res: StockQuantity[]) => {
      this.allStocks = res;
    });
  }

  onArticleSelected(articleId: number) {
    const article = this.articles.find(a => a.id === articleId);
    if (article) {
      this.selectedArticle = article;
      this.isArticleTypeWood = article.iswood;
      
      // Filter package references available for this article at the selected site
      this.packageReferences = this.allStocks
        .filter(s => s.articleId === articleId)
        .map(s => s.packageReference);
      
      // If no stocks found, default to 'Standard'
      if (this.packageReferences.length === 0) {
        this.packageReferences = ['Standard'];
      }

      this.merchandiseForm.patchValue({ reference: this.packageReferences[0] });

      if (this.isArticleTypeWood) {
        this.merchandiseForm.get('quantity')?.disable();
      } else {
        this.merchandiseForm.get('quantity')?.enable();
      }
    }
  }

  openAddQuantityModal(article: Article) {
    const dialogRef = this.dialog.open(AddLengthsModalComponent, {
      width: '800px',
      data: { article }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.responseFromModalLengths = result.lengths;
        this.responseFromModalTotQuantity = result.totalQuantity.toFixed(3);
        this.merchandiseForm.patchValue({ quantity: result.totalQuantity.toFixed(3) });
      }
    });
  }

  addMerchandise() {
    if (this.merchandiseForm.valid && this.selectedArticle) {
       const newMerch: Merchandise = {
         id: 0,
         article: this.selectedArticle,
         quantity: this.merchandiseForm.get('quantity')?.value,
         packagereference: this.merchandiseForm.get('reference')?.value || 'Standard',
         description: this.merchandiseForm.get('description')?.value || '',
         lisoflengths: this.isArticleTypeWood ? this.responseFromModalLengths : [],
         creationdate: new Date(),
         updatedate: new Date(),
         updatedbyid: Number(this.userconnected?.id),
         cost_ht: 0, cost_net_ht: 0, cost_ttc: 0, unit_price_ht: 0, tva_value: 0, cost_discount_value: 0, discount_percentage: 0,
         isinvoicible: false, allownegativstock: false, ismergedwith: false, idmergedmerchandise: 0, isdeleted: false, documentid: 0
       };

       const currentData = this.merchandiseList.data;
       currentData.push(newMerch);
       this.merchandiseList.data = [...currentData];
       this.resetMerchandiseForm();
    } else {
      this.toastr.warning('Veuillez remplir les informations de l\'article');
    }
  }

  resetMerchandiseForm() {
    this.merchandiseForm.reset({ reference: 'Standard', description: '' });
    this.searchControl.setValue('');
    this.selectedArticle = null;
    this.isArticleTypeWood = false;
    if (this.articleSelect) this.articleSelect.value = null;
  }

  deleteRow(element: Merchandise) {
    const dialogRef = this.dialog.open(ConfirmDeleteModalComponent, {
      width: '400px',
      data: { item: { name: element.article.reference } }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.merchandiseList.data = this.merchandiseList.data.filter(m => m !== element);
      }
    });
  }

  onCancel() {
    if (this.merchandiseList.data.length > 0) {
      const dialogRef = this.dialog.open(GenericConfirmationModalComponent, {
        width: '400px',
        data: {
          title: 'Quitter sans enregistrer',
          message: 'Vous avez des articles dans votre liste. Voulez-vous vraiment quitter ?',
          confirmText: 'Quitter',
          cancelText: 'Rester',
          icon: 'warning',
          color: 'warn'
        }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.router.navigate(['/home/inventory/list']);
        }
      });
    } else {
      this.router.navigate(['/home/inventory/list']);
    }
  }

  onSubmit() {
    if (this.inventoryForm.get('siteId')?.invalid) {
      this.toastr.warning('Veuillez choisir un site de vente');
      return;
    }

    if (this.merchandiseList.data.length === 0) {
      this.toastr.warning('Ajoutez au moins un article');
      return;
    }

    const siteName = this.SalesSite?.address || 'ce site';
    
    const dialogRef = this.dialog.open(GenericConfirmationModalComponent, {
      width: '450px',
      data: {
        title: 'Confirmer l\'enregistrement',
        message: `Voulez vous enregistrer l'inventaire à ${siteName} ?`,
        confirmText: 'Enregistrer',
        cancelText: 'Annuler',
        icon: 'save',
        color: 'accent'
      }
    });

    dialogRef.afterClosed().subscribe(isConfirmed => {
      if (isConfirmed) {
        this.executeSubmit();
      }
    });
  }

  executeSubmit() {
    const doc: Document = {
      id: 0,
      type: DocumentTypes.inventory,
      stocktransactiontype: 0 as any, // None
      description: this.inventoryForm.get('description')?.value,
      merchandises: this.merchandiseList.data,
      sales_site: this.SalesSite,
      updatedbyid: Number(this.userconnected?.id),
      creationdate: new Date(),
      updatedate: new Date(),
      docnumber: '', 
      supplierReference: '',
      total_ht_net_doc: 0, total_net_ttc: 0, total_tva_doc: 0, total_discount_doc: 0,
      isinvoiced: false, withholdingtax: false, isdeleted: false, isPaid: false, isservice: false,
      docstatus: 3 as any, billingstatus: 1 as any, // Created, NotBilled
      taxe: null!, holdingtax: null!, counterpart: null!, appuser: null!, regulationid: 0, editing: false
    };

    this.inventoryService.add(doc).subscribe({
      next: (res) => {
        this.toastr.success(`Inventaire ${res.docRef} enregistré`);
        this.router.navigate(['/home/inventory/list']);
      },
      error: (err) => this.toastr.error('Erreur lors de l\'enregistrement')
    });
  }
}
