using ms.webapp.api.acya.core.Entities.DTOs.Config;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.core.Entities.DTOs
{
  public class ListOflengthDto
  {
    public int id { get; set; }
    public int nbpieces { get; set; }
    public AppVariableDto? length { get; set; }
    public double quantity { get; set; }

    public ListOflengthDto() 
    {
      if (length != null && length.value != null)
      {
        // Calculate quantity based on nbpieces and the value from AppVariableDto
        quantity = nbpieces * double.Parse(length.value);
      }     
    }

    // Constructor to map from the ListOfLength entity
    public ListOflengthDto(ListOfLength entity)
    {
      id = entity.Id;
      nbpieces = entity.NumberOfPieces;
      quantity = entity.Quantity;
      length = entity.AppVarLength != null ? new AppVariableDto(entity.AppVarLength) : null;
    }

    public ListOflengthDto(QuantityMovement entity)
    {
      UpdateFromEntity(entity);
    }

    // Update DTO from entity
    public void UpdateFromEntity(QuantityMovement entity)
    {
      if (entity.ListOfLengths != null)
      {
        // Convert entity's ListOfLengths to ListOflengthDto
        var dtoList = entity.ListOfLengths
                            .Select(l => new ListOflengthDto(l))
                            .ToArray();
      }
    }
  }
}
