using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Workflow
{
    public class DocumentApprovalConfiguration : IEntityTypeConfiguration<DocumentApproval>
    {
        public void Configure(EntityTypeBuilder<DocumentApproval> builder)
        {
            builder.ToTable("document_approvals");

            builder.HasKey(x => x.Id);
            builder.Property(x => x.Id).HasColumnName("Id");
            builder.Property(x => x.DocumentId).HasColumnName("document_id");
            builder.Property(x => x.SubmittedByUserId).HasColumnName("submitted_by_user_id");
            builder.Property(x => x.DecidedByUserId).HasColumnName("decided_by_user_id");
            builder.Property(x => x.Decision).HasColumnName("Decision").HasConversion<int>();
            builder.Property(x => x.RejectionReason).HasColumnName("rejection_reason");
            builder.Property(x => x.SubmittedAt).HasColumnName("submitted_at");
            builder.Property(x => x.DecidedAt).HasColumnName("decided_at");

            builder.HasOne(x => x.Document)
                .WithMany()
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.SubmittedBy)
                .WithMany()
                .HasForeignKey(x => x.SubmittedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasOne(x => x.DecidedBy)
                .WithMany()
                .HasForeignKey(x => x.DecidedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.HasIndex(x => x.DocumentId);
            builder.HasIndex(x => x.Decision);
        }
    }
}
