using ms.webapp.api.acya.core.Entities.Dtos.Config;

namespace ms.webapp.api.acya.core.Entities.Categories
{
  public class Parent : IEntity
  {
    public Parent()
    {
      FirstChildren = new HashSet<FirstChild>();
    }
    public int Id { get; set; }
    public string? Reference { get; set; }
    public string? Description { get; set; }
    public DateTime? CreationDate { get; set; }
    public DateTime? UpdateDate { get; set; }
    public bool IsDeleted { get; set; }

    public int? UpdatedBy { get; set; }
    public AppUser? AppUser { get; set; }

    public HashSet<FirstChild>? FirstChildren { get; set; }

    public Parent(CategoryDto dto)
    {
      UpdateFromDto(dto);
    }

    public void UpdateFromDto(CategoryDto dto)
    {
      Id = (int)dto.id!;
      Reference = dto.reference;
      Description = dto.description;
      CreationDate = !string.IsNullOrEmpty(dto.creationdate.ToString()) ? DateTime.Parse(dto.creationdate.ToString()!) : DateTime.Now;
      UpdateDate = !string.IsNullOrEmpty(dto.updatedate.ToString()) ? DateTime.Parse(dto.updatedate.ToString()!) : DateTime.Now;
      IsDeleted = !string.IsNullOrEmpty(dto.isdeleted.ToString()) ? bool.Parse(dto.isdeleted.ToString()!) : (bool)dto.isdeleted!;
      UpdatedBy = dto.createdby;
      if (dto.firstchildren != null && dto.firstchildren.Any())
      {
        FirstChildren = dto.firstchildren
          .Select(dtochild => new FirstChild(dtochild))
          .ToHashSet();
      }
    }

  }
}
