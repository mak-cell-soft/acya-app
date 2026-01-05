using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class GenerateInvoiceDto
  {
    /**
     * dto : the target Document with some informations like Type
     * docChlidrenIds : Ids of children Documents to store the relation and calculate some Costs
     */
    public DocumentDto? invoiceDoc { get; set; }
    public int[]? docChildrenIds { get; set; }
  }
}
