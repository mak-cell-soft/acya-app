namespace ms.webapp.api.acya.core.Entities.DTOs.Config
{
  public class AppVariableDto
  {
    public int? id { get; set; }
    public string? nature { get; set; }
    public string? name { get; set; }
    public string? value { get; set; }
    public bool? isactive { get; set; }
    public bool? isdefault { get; set; }
    public bool? iseditable { get; set; }
    public bool? isdeleted { get; set; }
    public bool? editing { get; set; }

    public AppVariableDto()
    {
    }

    public AppVariableDto(AppVariable entity)
    {
      UpdateFromEntity(entity);
    }

    public void UpdateFromEntity(AppVariable entity)
    {
      id = entity.Id;
      nature = entity.Nature;
      name = entity.Name; 
      value = entity.GetFormattedValue();
      isactive = entity.isActive;
      isdefault = entity.isDefault;
      iseditable = entity.isEditable;
      isdeleted= entity.isDeleted;
    }

    // Method to get the formatted value
    public double GetFormattedValue()
    {
      switch (nature)
      {
        case "Taxe":
          return double.Parse(value!);
        case "Tva":
          // Remove the '%' character before parsing
          string valueWithoutPercent = value!.TrimEnd('%');
          return double.Parse(valueWithoutPercent);
        case "thickness":
        case "width":
        case "Length":
          string valuereplacestopbycomma = value!.Replace('.', ',')!;
          return double.Parse(valuereplacestopbycomma!);
        default:
          return double.Parse(value!);
      }
      
    }
  }
}
