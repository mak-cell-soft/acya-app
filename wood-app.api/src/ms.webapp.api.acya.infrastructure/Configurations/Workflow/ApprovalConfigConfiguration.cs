using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Workflow
{
    public class ApprovalConfigConfiguration : IEntityTypeConfiguration<ApprovalConfig>
    {
        public void Configure(EntityTypeBuilder<ApprovalConfig> builder)
        {
            builder.ToTable("approval_configs");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.ThresholdAmount).HasPrecision(18, 3);

            builder.HasOne(x => x.Enterprise)
                .WithMany()
                .HasForeignKey(x => x.EnterpriseId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.EnterpriseId)
                .IsUnique();
        }
    }
}
