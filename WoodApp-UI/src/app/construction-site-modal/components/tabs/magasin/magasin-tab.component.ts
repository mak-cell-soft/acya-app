import { Component, Input } from '@angular/core';
import { ConstructionSite, Tool, Vehicle } from '../../../../models/construction-site.model';

@Component({
  selector: 'app-magasin-tab',
  templateUrl: './magasin-tab.component.html',
  styleUrls: ['./magasin-tab.component.css']
})
export class MagasinTabComponent {
  @Input() site!: ConstructionSite;

  getFixedTools(): Tool[] {
    return this.site.magasin.tools.filter(t => t.type === 'fixe');
  }

  getMobileTools(): Tool[] {
    return this.site.magasin.tools.filter(t => t.type === 'mobile');
  }

  getVehicleForTool(tool: Tool): Vehicle | undefined {
    return this.site.vehicles.find(v => v.id === tool.vehicleId);
  }
}
