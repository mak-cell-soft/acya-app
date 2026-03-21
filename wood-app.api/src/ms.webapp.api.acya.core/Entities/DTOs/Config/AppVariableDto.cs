using System.Globalization;
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
      if (string.IsNullOrEmpty(value)) return 0;
      
      string cleanValue = value;
      if (nature == "Tva")
      {
          cleanValue = value.TrimEnd('%');
      }

      // Use InvariantCulture and handle both dot and comma to be safe
      cleanValue = cleanValue.Replace(',', '.');

      if (double.TryParse(cleanValue, NumberStyles.Any, CultureInfo.InvariantCulture, out double result))
      {
          return result;
      }
      
      return 0;
    }
  }
}
