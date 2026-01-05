using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.core.Entities.Product
{
  public class ListOfLength : IEntity
  {
    public int Id { get; set; }
    public int NumberOfPieces { get; set; }
    public double Quantity { get; set; }

    public int? AppVarLengthId { get; set; }
    public AppVariable? AppVarLength { get; set; }

    public int QuantityMovementId { get; set; }
    public QuantityMovement? QuantityMovements { get; set; }

    public ListOfLength() { }

    public ListOfLength(ListOflengthDto dto)
    {
      if (dto != null && dto.nbpieces > 0) // Ensure NumberOfPieces > 0
      {
        Id = dto.id;
        NumberOfPieces = dto.nbpieces;
        Quantity = dto.quantity;

        // Initialize AppVarLength from DTO
        if (dto.length != null)
        {
          AppVarLength = new AppVariable
          {
            Id = (int)dto.length.id!,
            Name = dto.length.name,
            Nature = dto.length.nature,
            Value = double.Parse(dto.length.value!),
            isActive = dto.length.isactive,
            isDefault = dto.length.isdefault,
            isDeleted = dto.length.isdeleted,
            isEditable = dto.length.iseditable
          };
          AppVarLengthId = AppVarLength.Id;
        }
      }
    }
  }
}
