using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.infrastructure.Configurations.Documents
{
    public class DocumentDocumentRelationshipConfiguration : IEntityTypeConfiguration<DocumentDocumentRelationship>
    {
        public void Configure(EntityTypeBuilder<DocumentDocumentRelationship> entity)
        {
            entity.ToTable("tbl_document_document_relationship");

            // Explicitly map properties to database columns
            entity.Property(e => e.ParentDocumentId).HasColumnName("parent_document_id");
            entity.Property(e => e.ChildDocumentId).HasColumnName("child_document_id");

            // Define composite primary key
            entity.HasKey(e => new { e.ParentDocumentId, e.ChildDocumentId });

            // Configure relationship to the parent document
            entity.HasOne(e => e.ParentDocument)
                  .WithMany(d => d.ChildDocuments)
                  .HasForeignKey(e => e.ParentDocumentId)
                  .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete
        }
    }
}
