import { Component, Input } from '@angular/core';
import { ConstructionSite } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-general-tab',
  templateUrl: './general-tab.component.html',
  styleUrls: ['./general-tab.component.css']
})
export class GeneralTabComponent {
  @Input() site!: ConstructionSite;
}
