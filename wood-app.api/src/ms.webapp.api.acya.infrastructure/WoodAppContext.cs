using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Categories;
using ms.webapp.api.acya.core.Entities.Product;
//using ms.webapp.api.acya.core.Permissions;

namespace ms.webapp.api.acya.infrastructure
{
  public class WoodAppContext : DbContext
  {
    public WoodAppContext()
    {
    }

    public WoodAppContext(DbContextOptions<WoodAppContext> options) : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
      if (!optionsBuilder.IsConfigured)
      {
      }
    }

    public virtual DbSet<AppHealth> AppHealths { get; set; }
    public virtual DbSet<Parent> Parents { get; set; }
    public virtual DbSet<FirstChild> FirstChildren { get; set; }
    public virtual DbSet<SecondChild> SecondChildren { get; set; }
    public virtual DbSet<Person> Persons { get; set; }
    public virtual DbSet<AppUser> AppUsers { get; set; }
    public virtual DbSet<Bank> Banks { get; set; }
    public virtual DbSet<AppVariable> AppVariables { get; set; }
    public virtual DbSet<Article> Articles { get; set; }
    public virtual DbSet<SellPriceHistory> SellPricesHistories { get; set; }
    public virtual DbSet<Provider> Providers { get; set; }
    public virtual DbSet<Enterprise> Enterprises { get; set; }

    public virtual DbSet<SalesSite> SalesSites { get; set; }
    public virtual DbSet<CounterPart> CounterParts { get; set; }

    public virtual DbSet<Merchandise> Merchandises { get; set; }
    public virtual DbSet<Document> Documents { get; set; }

    public virtual DbSet<DocumentMerchandise> DocumentMerchandises { get; set; }

    public virtual DbSet<ListOfLength> ListOfLengths { get; set; }
    public virtual DbSet<QuantityMovement> QuantityMovements { get; set; }

    public virtual DbSet<Stock> Stocks { get; set; }

    public virtual DbSet<DocumentDocumentRelationship> DocumentDocumentRelationships { get; set; }

    public virtual DbSet<Transporter> Transporters { get; set; }
    public virtual DbSet<Vehicle> Vehicles { get; set; }

    public virtual DbSet<StockTransfer> StockTransfers { get; set; }

    public DbSet<PendingNotification> PendingNotifications { get; set; }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
      base.OnModelCreating(modelBuilder);
      modelBuilder.ApplyConfigurationsFromAssembly(System.Reflection.Assembly.GetExecutingAssembly());
    }
  }
}
