import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ConstructionSite } from '../../../models/construction-site.model';

@Component({
  selector: 'app-sites-sidebar',
  templateUrl: './sites-sidebar.component.html',
  styleUrls: ['./sites-sidebar.component.css']
})
export class SitesSidebarComponent {
  @Input() sites: ConstructionSite[] = [];
  @Input() selectedId: string | null = null;
  @Output() siteSelected = new EventEmitter<string>();

  onSelect(id: string) {
    this.siteSelected.emit(id);
  }
}
