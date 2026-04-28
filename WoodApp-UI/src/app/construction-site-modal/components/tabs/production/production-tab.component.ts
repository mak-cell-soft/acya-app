import { Component, Input } from '@angular/core';
import { ConstructionSite, Production, ProductionCategory } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-production-tab',
  templateUrl: './production-tab.component.html',
  styleUrls: ['./production-tab.component.css']
})
export class ProductionTabComponent {
  @Input() site!: ConstructionSite;

  categories: ProductionCategory[] = [
    'bois',
    'aluminium',
    'fer',
    'climatisation',
    'plomberie'
  ];

  getCategoryLabel(cat: ProductionCategory): string {
    const labels: Record<ProductionCategory, string> = {
      bois: 'Bois',
      aluminium: 'Aluminium',
      fer: 'Fer',
      climatisation: 'Climatisation',
      plomberie: 'Plomberie'
    };
    return labels[cat];
  }

  getProductionsByCategory(cat: ProductionCategory): Production[] {
    return this.site.productions.filter(p => p.category === cat);
  }
}
