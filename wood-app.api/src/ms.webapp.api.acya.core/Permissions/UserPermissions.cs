//using ms.webapp.api.acya.core.Entities;

//namespace ms.webapp.api.acya.core.Permissions
//{
//  public class UserPermissions : IEntity
//  {
//    public int Id { get; set; }
//    public int UserId { get; set; }
//    public AppUser? AppUsers { get; set; }

//    public ArticlePermissions Articles { get; set; } = new ArticlePermissions();
//    public ProviderPermissions Providers { get; set; } = new ProviderPermissions();
//    public AppVariablePermissions AppVariables { get; set; } = new AppVariablePermissions();
//    public BankPermissions Banks { get; set; } = new BankPermissions();
//    public CustomerPermissions Customers { get; set; } = new CustomerPermissions();
//  }

//  // Articles
//  public class ArticlePermissions
//  {
//    public bool CanRead { get; set; }
//    public bool CanAdd { get; set; }
//    public bool CanUpdate { get; set; }
//    public bool CanDelete { get; set; }
//  }

//  // Providers
//  public class ProviderPermissions
//  {
//    public bool CanRead { get; set; }
//    public bool CanAdd { get; set; }
//    public bool CanUpdate { get; set; }
//    public bool CanDelete { get; set; }
//  }

//  // AppVariables
//  public class AppVariablePermissions
//  {
//    public bool CanRead { get; set; }
//    public bool CanAdd { get; set; }
//    public bool CanUpdate { get; set; }
//    public bool CanDelete { get; set; }
//  }

//  // Banks
//  public class BankPermissions
//  {
//    public bool CanRead { get; set; }
//    public bool CanAdd { get; set; }
//    public bool CanUpdate { get; set; }
//    public bool CanDelete { get; set; }
//  }

//  // Customer
//  public class CustomerPermissions
//  {
//    public bool CanRead { get; set; }
//    public bool CanAdd { get; set; }
//    public bool CanUpdate { get; set; }
//    public bool CanDelete { get; set; }
//  }
//}
