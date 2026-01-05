using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Categories;

namespace ms.webapp.api.acya.infrastructure.Configurations.Stock
{
    public class SecondChildConfiguration : IEntityTypeConfiguration<SecondChild>
    {
        public void Configure(EntityTypeBuilder<SecondChild> entity)
        {
            entity.ToTable("tbl_second_child");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Reference).HasColumnName("reference");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreationDate).HasColumnName("creationdate");
            entity.Property(e => e.UpdateDate).HasColumnName("updatedate");
            entity.Property(e => e.IsDeleted).HasColumnName("isdeleted");
            entity.Property(e => e.UpdatedBy).HasColumnName("idappuser");

            entity.HasOne(e => e.FirstChildren).WithMany(q => q.SecondChildren).HasForeignKey(e => e.IdFirstChild);
        }
    }
}
