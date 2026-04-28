import { Component, Input } from '@angular/core';
import { ConstructionSite, Employee, EmployeeRole } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-equipe-tab',
  templateUrl: './equipe-tab.component.html',
  styleUrls: ['./equipe-tab.component.css']
})
export class EquipeTabComponent {
  @Input() site!: ConstructionSite;

  roles: EmployeeRole[] = [
    'chef_chantier',
    'macon',
    'menuisier',
    'electricien',
    'plombier',
    'peintre',
    'ouvrier'
  ];

  getRoleLabel(role: EmployeeRole): string {
    const labels: Record<EmployeeRole, string> = {
      chef_chantier: 'Chef de Chantier',
      macon: 'Maçon',
      menuisier: 'Menuisier',
      electricien: 'Électricien',
      plombier: 'Plombier',
      peintre: 'Peintre',
      ouvrier: 'Ouvrier'
    };
    return labels[role];
  }

  getEmployeesByRole(role: EmployeeRole): Employee[] {
    return this.site.employees.filter(e => e.role === role);
  }
}
