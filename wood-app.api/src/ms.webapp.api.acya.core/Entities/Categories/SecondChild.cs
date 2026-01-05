namespace ms.webapp.api.acya.core.Entities.Categories
{
    public class SecondChild : IEntity
    {
        public int Id { get; set; }
        public string? Reference { get; set; }
        public string? Description { get; set; }
        public DateTime? CreationDate { get; set; }
        public DateTime? UpdateDate { get; set; }
        public bool IsDeleted { get; set; }

        public int? UpdatedBy { get; set; }
        public AppUser? AppUser { get; set; }

        public int? IdFirstChild { get; set; }
        public FirstChild? FirstChildren { get; set; }
    }
}
