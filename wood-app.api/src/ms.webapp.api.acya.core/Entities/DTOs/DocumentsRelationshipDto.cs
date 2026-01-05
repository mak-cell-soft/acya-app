using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class DocumentsRelationshipDto
  {
    public int ParentDocumentId { get; set; }
    public int ChildDocumentId { get; set; }
    public DocumentDto? ParentDocument { get; set; }
    public DocumentDto? ChildDocument { get; set; }
  }
}
