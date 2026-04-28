import { Component, Input } from '@angular/core';
import { ConstructionSite } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-materiaux-tab',
  templateUrl: './materiaux-tab.component.html',
  styleUrls: ['./materiaux-tab.component.css']
})
export class MateriauxTabComponent {
  @Input() site!: ConstructionSite;

  isLowStock(item: any): boolean {
    return item.quantity < item.minThreshold;
  }
}
