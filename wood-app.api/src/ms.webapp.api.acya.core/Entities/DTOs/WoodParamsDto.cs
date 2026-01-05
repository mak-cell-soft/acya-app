using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class WoodParamsDto
  {
    public string? merchandiseRef { get; set; }
    public int merchandiseId { get; set; }
    public int salesSiteId { get; set; }
  }

  /**
   * Utilsé pour charger les documents par type et par mois
   */
  public class TypeDocToFilterDto
  {
    public int day { get; set; }
    public int month { get; set; }
    public int year { get; set; }
    public DocumentTypes typeDoc { get; set; }
  }
}
