import { Component, Input, OnInit } from '@angular/core';
import { ConstructionSite } from '../../../models/construction-site.model';


@Component({
  selector: 'app-site-detail',
  templateUrl: './site-detail.component.html',
  styleUrls: ['./site-detail.component.css'],
})
export class SiteDetailComponent implements OnInit {
  @Input() site!: ConstructionSite;
  
  activeTab = 0;

  constructor() {}

  ngOnInit(): void {}

  setTab(index: number) {
    this.activeTab = index;
  }
}
