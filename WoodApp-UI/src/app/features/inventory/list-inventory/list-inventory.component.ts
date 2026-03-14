import { Component, inject, OnInit } from '@angular/core';
import { InventoryService } from '../../../services/components/inventory.service';
import { Document, DocStatus } from '../../../models/components/document';
import { ToastrService } from 'ngx-toastr';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-list-inventory',
  templateUrl: './list-inventory.component.html',
  styleUrl: './list-inventory.component.css',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({height: '0px', minHeight: '0', display: 'none'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ListInventoryComponent implements OnInit {
  inventoryService = inject(InventoryService);
  toastr = inject(ToastrService);

  inventories: Document[] = [];
  isLoading = true;
  expandedElement: Document | null = null;
  displayedColumns = ['reference', 'site', 'date', 'status', 'actions'];

  ngOnInit(): void {
    this.loadInventories();
  }

  loadInventories() {
    this.isLoading = true;
    this.inventoryService.getAll().subscribe({
      next: (res) => {
        this.inventories = res;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Erreur chargement inventaires');
        this.isLoading = false;
      }
    });
  }

  validateInventory(id: number) {
    this.inventoryService.validate(id).subscribe({
      next: (res) => {
        this.toastr.success(res.message);
        this.loadInventories();
      },
      error: () => this.toastr.error('Erreur lors de la validation')
    });
  }

  getDiffClass(counted: number, stock: number) {
    const diff = counted - stock;
    if (diff === 0) return 'diff-match';
    if (diff > 0) return 'diff-surplus';
    return 'diff-shortage';
  }

  getStatusLabel(status: number) {
    if (status === 12) return 'Validé';
    return 'En attente';
  }
}
