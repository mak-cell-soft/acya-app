using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.infrastructure.Configurations;

namespace ms.admin.api.acya.infrastructure
{
    public class MasterDbContext : DbContext
    {
        public MasterDbContext(DbContextOptions<MasterDbContext> options) : base(options)
        {
        }

        public DbSet<MasterEnterprise> Enterprises { get; set; } = null!;
        public DbSet<SuperAdminUser> SuperAdminUsers { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.ApplyConfiguration(new MasterEnterpriseConfiguration());
            modelBuilder.ApplyConfiguration(new SuperAdminUserConfiguration());
        }
    }
}
