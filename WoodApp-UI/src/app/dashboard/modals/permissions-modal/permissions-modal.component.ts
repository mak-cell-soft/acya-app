import { Component } from '@angular/core';

@Component({
  selector: 'app-permissions-modal',
  templateUrl: './permissions-modal.component.html',
  styleUrl: './permissions-modal.component.css'
})
export class PermissionsModalComponent {
  displayedColumns: string[] = ['Operation', 'canRead', 'canAdd', 'canUpdate', 'canDelete','user'];
  venteColumns: string[] = ['ecrire', 'lire', 'annuler'];

  routePermissions = [
    { client: true, fournisseur: true, produitEtService: true, vente: true, achat: true, comptabilite: true, stock: true },
  ];

  ventePermissions = [
    { ecrire: true, lire: true, annuler: true },
  ];
}
