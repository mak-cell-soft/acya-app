using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class QuantityMovement : IEntity
  {
    public int Id { get; set; }
    public string? LengthIds { get; set; }
    public double? Quantity { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }

    public int DocumentMerchandiseId { get; set; }
    public DocumentMerchandise? DocumentMerchandise { get; set; }

    public virtual ICollection<ListOfLength> ListOfLengths { get; set; } = new List<ListOfLength>();

    public QuantityMovement() { }

    public QuantityMovement(ListOflengthDto[] listOflengthDtos)
    {
      UpdateFromDto(listOflengthDtos);
    }

    public void UpdateFromDto(ListOflengthDto[] listOflengthDtos)
    {
      if (listOflengthDtos != null && listOflengthDtos.Length > 0)
      {
        var lisOfLengths = new HashSet<ListOfLength>();
        double totalQuantity = 0;
        var ids = new List<int>(); // List to store the IDs for the string

        foreach (var dto in listOflengthDtos)
        {
          var l = new ListOfLength(dto); // Initialize ListOfLength from DTO

          // Add to the list of lengths
          lisOfLengths.Add(l);

          // Accumulate the total quantity
          totalQuantity += dto.quantity;

          // Add the ID to the list for later conversion to string
          ids.Add(dto.id);
        }

        // Assign the calculated sum of quantities to QuantityMovement
        Quantity = totalQuantity;

        // Assign the list of lengths to the QuantityMovement
        ListOfLengths = lisOfLengths;

        // Convert the list of IDs to a comma-separated string
        LengthIds = string.Join(",", ids);
      }
      else
      {
        ListOfLengths = null!;
        LengthIds = null;
      }
    }
  }
}
