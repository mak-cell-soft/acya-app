import { Component, OnInit, signal, computed } from '@angular/core';
import { ConstructionSite, SiteFlag } from '../models/construction-site.model';

@Component({
  selector: 'app-construction-site-management',
  templateUrl: './construction-site-management.component.html',
  styleUrls: ['./construction-site-management.component.css']
})
export class ConstructionSiteManagementComponent implements OnInit {
  // Signal for the list of sites
  sites = signal<ConstructionSite[]>([]);
  
  // Signal for the currently selected site
  selectedSiteId = signal<string | null>(null);
  
  // Computed signal for the active site
  activeSite = computed(() => 
    this.sites().find(s => s.id === this.selectedSiteId()) || null
  );

  constructor() {}

  ngOnInit(): void {
    // Initialize with mock data
    this.loadMockData();
  }

  selectSite(id: string) {
    this.selectedSiteId.set(id);
  }

  private loadMockData() {
    const mockSites: ConstructionSite[] = [
      {
        id: '1',
        name: 'Résidence El Mansour',
        description: 'Construction d\'un complexe résidentiel de haut standing R+5.',
        flag: 'orange',
        location: 'Tunis, Berges du Lac',
        createdAt: new Date('2024-01-15'),
        estimatedEndDate: new Date('2025-06-30'),
        progressPercent: 62,
        employees: [],
        productions: [],
        materials: [],
        consumables: [],
        magasin: {
          responsable: { id: 'e1', firstName: 'Ahmed', lastName: 'Ben Salah', role: 'chef_chantier', joinedAt: new Date() },
          tools: []
        },
        vehicles: [],
        lifecycle: [
          { id: 'l1', date: new Date('2024-01-15'), title: 'Ouverture du chantier', description: 'Signature et installation', status: 'done' },
          { id: 'l2', date: new Date('2024-02-01'), title: 'Terrassement', description: 'Excavation terminée', status: 'done' },
          { id: 'l3', date: new Date('2024-03-15'), title: 'Gros œuvre', description: 'En cours', status: 'current' }
        ],
        internalNote: 'Retard sur la livraison du ciment prévu semaine prochaine.'
      },
      {
        id: '2',
        name: 'Villa Gammarth',
        description: 'Rénovation complète d\'une villa individuelle.',
        flag: 'green',
        location: 'Gammarth Supérieur',
        createdAt: new Date('2024-03-01'),
        progressPercent: 15,
        employees: [],
        productions: [],
        materials: [],
        consumables: [],
        magasin: {
          responsable: { id: 'e2', firstName: 'Mohamed', lastName: 'Trabelsi', role: 'chef_chantier', joinedAt: new Date() },
          tools: []
        },
        vehicles: [],
        lifecycle: [
          { id: 'l1', date: new Date('2024-03-01'), title: 'Ouverture du chantier', description: 'Installation', status: 'done' }
        ]
      }
    ];
    
    this.sites.set(mockSites);
    if (mockSites.length > 0) {
      this.selectedSiteId.set(mockSites[0].id);
    }
  }
}
