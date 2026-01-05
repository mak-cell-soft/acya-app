using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class ParentConfiguration : IEntityTypeConfiguration<Parent>
    {
        public void Configure(EntityTypeBuilder<Parent> entity)
        {
            entity.ToTable("tbl_parent");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.UpdatedBy).HasColumnName("idappuser");

            entity.HasOne(e => e.AppUser)
              .WithMany() // Or .WithMany(u => u.Parents) if you have a collection of Parents in AppUser
              .HasForeignKey(e => e.UpdatedBy)
              .OnDelete(DeleteBehavior.SetNull); // Or your desired delete behavior
        }
    }
}
