using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities
{
  public class DocumentDocumentRelationship
  {
    public int ParentDocumentId { get; set; } // Foreign key to the parent document
    public int ChildDocumentId { get; set; }  // Foreign key to the child document

    // Navigation properties
    public Document? ParentDocument { get; set; }
    public Document? ChildDocument { get; set; }

    public DocumentDocumentRelationship()
    {

    }

    public DocumentDocumentRelationship(DocumentsRelationshipDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto (DocumentsRelationshipDto dto)
    {

    }
  }
}
