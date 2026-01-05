using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class FirstChildConfiguration : IEntityTypeConfiguration<FirstChild>
    {
        public void Configure(EntityTypeBuilder<FirstChild> entity)
        {
            entity.ToTable("tbl_first_child");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.UpdatedBy).HasColumnName("idappuser");
            entity.Property(e => e.IdParent).HasColumnName("idparent");

            entity.HasOne(e => e.Parents).WithMany(q => q.FirstChildren).HasForeignKey(e => e.IdParent);
            entity.HasOne(e => e.AppUser)
               .WithMany()
               .HasForeignKey(e => e.UpdatedBy)
               .OnDelete(DeleteBehavior.SetNull); // Or your desired delete behavior
        }
    }
}
