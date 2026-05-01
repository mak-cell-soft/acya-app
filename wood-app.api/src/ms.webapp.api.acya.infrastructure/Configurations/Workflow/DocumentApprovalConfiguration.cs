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
            builder.Property(x => x.Decision).HasConversion<int>();

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
