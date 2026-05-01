using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Partners
{
    public class PricingGridConfiguration : IEntityTypeConfiguration<PricingGrid>
    {
        public void Configure(EntityTypeBuilder<PricingGrid> builder)
        {
            builder.ToTable("tbl_pricing_grid");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("id");
            builder.Property(x => x.CounterPartId).HasColumnName("counterpart_id");
            builder.Property(x => x.MerchandiseId).HasColumnName("merchandise_id");
            builder.Property(x => x.DiscountRate).HasColumnName("discount_rate");
            builder.Property(x => x.ValidFrom).HasColumnName("valid_from");
            builder.Property(x => x.ValidUntil).HasColumnName("valid_until");
            builder.Property(x => x.IsActive).HasColumnName("is_active");
            builder.Property(x => x.Notes).HasColumnName("notes");
            builder.Property(x => x.CreationDate).HasColumnName("creation_date");
            builder.Property(x => x.UpdateDate).HasColumnName("update_date");
            builder.Property(x => x.UpdatedById).HasColumnName("updated_by_id");

            builder.HasOne(x => x.CounterPart)
                .WithMany()
                .HasForeignKey(x => x.CounterPartId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Merchandise)
                .WithMany()
                .HasForeignKey(x => x.MerchandiseId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasOne(x => x.AppUsers)
                .WithMany()
                .HasForeignKey(x => x.UpdatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Index for faster lookup by customer and article
            builder.HasIndex(x => new { x.CounterPartId, x.MerchandiseId, x.IsActive });
            
            // Check constraint for discount rate (handled at database level if supported, otherwise documentation)
            // Note: PostgreSQL supports CHECK constraints.
        }
    }
}
