using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ms.webapp.api.acya.core.Entities.Chantier;

namespace ms.webapp.api.acya.infrastructure.Configurations.Chantier
{
  public class ChantierTeamMemberConfiguration : IEntityTypeConfiguration<ChantierTeamMember>
  {
    public void Configure(EntityTypeBuilder<ChantierTeamMember> entity)
    {
      entity.ToTable("chantier_team_members");

      entity.HasKey(e => e.Id);

      entity.Property(e => e.Id).HasColumnName("Id").ValueGeneratedOnAdd();
      entity.Property(e => e.ChantierId).HasColumnName("ChantierId").IsRequired();
      entity.Property(e => e.PersonId).HasColumnName("PersonId").IsRequired();
      entity.Property(e => e.ChantierRole).HasColumnName("ChantierRole").HasMaxLength(100).IsRequired();
      entity.Property(e => e.AssignedAt).HasColumnName("AssignedAt").IsRequired();
      entity.Property(e => e.ReleasedAt).HasColumnName("ReleasedAt");
      entity.Property(e => e.IsActive).HasColumnName("IsActive").IsRequired();
      entity.Property(e => e.AssignedById).HasColumnName("AssignedById").IsRequired();
      entity.Property(e => e.CreationDate).HasColumnName("CreationDate").IsRequired();

      entity.HasOne(e => e.Person)
            .WithMany()
            .HasForeignKey(e => e.PersonId)
            .OnDelete(DeleteBehavior.Restrict);

      entity.HasIndex(e => e.ChantierId);
      entity.HasIndex(e => e.PersonId);
    }
  }
}
