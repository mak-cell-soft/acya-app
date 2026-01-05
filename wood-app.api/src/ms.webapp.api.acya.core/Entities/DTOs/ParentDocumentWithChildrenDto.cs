using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class ParentDocumentWithChildrenDto
  {
    public int ParentDocumentId { get; set; }
    public DocumentDto? ParentDocument { get; set; }
    public List<DocumentDto> ChildDocuments { get; set; } = new List<DocumentDto>();
  }
}
