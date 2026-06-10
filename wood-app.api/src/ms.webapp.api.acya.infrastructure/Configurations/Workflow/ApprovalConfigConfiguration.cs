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
            builder.Property(x => x.Id).HasColumnName("Id");
            builder.Property(x => x.ThresholdAmount).HasColumnName("threshold_amount").HasPrecision(18, 3);
            builder.Property(x => x.ApproverEmails).HasColumnName("approver_emails");
            builder.Property(x => x.ApproverRoles).HasColumnName("approver_roles");
            builder.Property(x => x.CreatedAt).HasColumnName("created_at");
            builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
            builder.Property(x => x.EnterpriseId).HasColumnName("enterprise_id");

            builder.HasOne(x => x.Enterprise)
                .WithMany()
                .HasForeignKey(x => x.EnterpriseId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(x => x.EnterpriseId)
                .IsUnique();
        }
    }
}
