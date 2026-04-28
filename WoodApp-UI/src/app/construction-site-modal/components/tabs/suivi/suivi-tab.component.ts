import { Component, Input } from '@angular/core';
import { ConstructionSite } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-suivi-tab',
  templateUrl: './suivi-tab.component.html',
  styleUrls: ['./suivi-tab.component.css']
})
export class SuiviTabComponent {
  @Input() site!: ConstructionSite;

  tradeProgress = [
    { label: 'Terrassement', value: 100, color: '#639922' },
    { label: 'Gros Œuvre', value: 75, color: '#378add' },
    { label: 'Menuiserie', value: 30, color: '#ef9f27' },
    { label: 'Électricité', value: 10, color: '#d85a30' }
  ];

  alerts = [
    { type: 'critical', msg: 'Livraison ciment en retard (3 jours)' },
    { type: 'warning', msg: 'Effectif menuisier réduit pour demain' }
  ];
}
