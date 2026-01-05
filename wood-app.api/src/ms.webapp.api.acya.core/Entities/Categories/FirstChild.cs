using ms.webapp.api.acya.core.Entities.Dtos.Config;

namespace ms.webapp.api.acya.core.Entities.Categories
{
  public class FirstChild : IEntity
  {
    public FirstChild()
    {
      SecondChildren = new HashSet<SecondChild>();
    }
    public int Id { get; set; }
    public string? Reference { get; set; }
    public string? Description { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }

    public int? UpdatedBy { get; set; }
    public AppUser? AppUser { get; set; }

    public int? IdParent { get; set; }
    public Parent? Parents { get; set; }

    public HashSet<SecondChild>? SecondChildren { get; set; }

    public FirstChild(FirstChildDto dto)
    {
      UpdateFromDto(dto);
    }

    // Method to update the entity from the DTO
    public void UpdateFromDto(FirstChildDto dto)
    {
      Id = (int)dto.id!;
      Reference = dto.reference;
      Description = dto.description;
      CreationDate = !string.IsNullOrEmpty(dto.creationdate.ToString()) ? DateTime.Parse(dto.creationdate.ToString()!) : DateTime.Now;
      UpdateDate = !string.IsNullOrEmpty(dto.updatedate.ToString()) ? DateTime.Parse(dto.updatedate.ToString()!) : DateTime.Now;
      UpdatedBy = dto.updatedBy;
      IdParent = dto.idparent;
    }
  }
}
