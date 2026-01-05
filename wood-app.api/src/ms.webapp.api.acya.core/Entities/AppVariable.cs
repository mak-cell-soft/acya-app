using ms.webapp.api.acya.core.Entities.DTOs.Config;

namespace ms.webapp.api.acya.core.Entities
{
  public class AppVariable : IEntity
  {
    public int Id { get; set; }
    public string? Nature { get; set; }
    public string? Name { get; set; }
    public double? Value { get; set; }
    public bool? isActive { get; set; }
    public bool? isDefault { get; set; }
    public bool? isEditable { get; set; }
    public bool? isDeleted { get; set; }

    public AppVariable() { }

    public AppVariable(AppVariableDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(AppVariableDto dto)
    {
      Id = (int)dto.id!;
      Nature = dto.nature;
      Name = dto.name!;
      Value = dto.GetFormattedValue();
      isActive = dto.isactive;
      isDefault = dto.isdefault;
      isEditable = dto.iseditable;
      isDeleted = dto.isdeleted;
    }

    // Method to get the formatted value
    public string GetFormattedValue()
    {
      switch (Nature)
      {
        case "Taxe":
          return Value?.ToString("F3") ?? "0.000";
        case "Tva":
          return Value?.ToString() + "%";
        case "thickness":
        case "width":
        case "Length":
          return Value?.ToString("F3") ?? "0.000";

        //return Value?.ToString()!;
        default:
          return Value?.ToString()!;
      }
    }
  }
}
