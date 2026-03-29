using ms.webapp.api.acya.common;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class UpdateDocStatusDto
  {
    public DocStatus DocStatus { get; set; }
    public string? SupplierReference { get; set; }
  }
}
