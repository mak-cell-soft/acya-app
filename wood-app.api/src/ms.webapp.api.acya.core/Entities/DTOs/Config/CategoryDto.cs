using System.Data;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.core.Entities.Dtos.Config
{
  /**
   * CategoryDto is Parent class with its Children
   * CategoryDto is like ParentDto
   * I choosed this name for better understanding
   */

  public class CategoryDto
  {
    public int? id { get; set; }
    public int? createdby { get; set; }
    public string? reference { get; set; }
    public string? description { get; set; }
    public DateTime? updatedate { get; set; }
    public DateTime? creationdate { get; set; }
    public bool? isdeleted { get; set; }
    public bool? editing { get; set; } = false;
    public FirstChildDto[]? firstchildren { get; set; }

    public CategoryDto() { }
    public CategoryDto(Parent entity)
    {
      id = entity.Id;
      createdby = (int)entity.UpdatedBy!;
      reference = entity.Reference;
      description = entity.Description;
      updatedate = entity.UpdateDate;
      creationdate = entity.CreationDate;
      isdeleted = entity.IsDeleted;
      if (entity.FirstChildren != null && entity.FirstChildren.Any())
      {
        firstchildren = entity.FirstChildren
            .Select(child => new FirstChildDto(child))
            .ToArray();
      }
    }
  }

  public class FirstChildDto
  {
    public int? id { get; set; }
    public string? reference { get; set; }
    public string? description { get; set; }
    public DateTime? creationdate { get; set; }
    public DateTime? updatedate { get; set; }
    public bool isdeleted { get; set; }
    public int? updatedBy { get; set; }
    public int? idparent { get; set; }
    public bool? editing { get; set; } = false;
    public bool? isNew { get; set; } = false;
    public FirstChildDto() { }
    public FirstChildDto(FirstChild entiry)
    {
      UpdateFromEntity(entiry);
    }

    public void UpdateFromEntity(FirstChild entiry)
    {
      id = entiry.Id;
      reference = entiry.Reference;
      description = entiry.Description;
      creationdate = entiry.CreationDate;
      updatedate = entiry.UpdateDate;
      isdeleted = entiry.IsDeleted;
      updatedBy = entiry.UpdatedBy;
      if (entiry.Parents != null)
      {
        idparent = entiry.Parents.Id;
      }
      else
      {
        idparent = 0;
      }
    }
  }

}
