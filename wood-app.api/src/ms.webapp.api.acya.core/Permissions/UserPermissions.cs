using System;
using ms.webapp.api.acya.core.Entities;

namespace ms.webapp.api.acya.core.Permissions
{
    public class UserPermissions : IEntity
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public AppUser? AppUser { get; set; }
        
        /// <summary>
        /// JSON serialized permissions object mapped to AppPermissionsMap
        /// </summary>
        public string Permissions { get; set; } = "{}";
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }

    public class ModulePermissions
    {
        public bool CanRead { get; set; }
        public bool CanAdd { get; set; }
        public bool CanUpdate { get; set; }
        public bool CanDelete { get; set; }
    }

    public class MobileAppPermissions
    {
        public bool CanView { get; set; }
        public bool CanDownload { get; set; }
        public bool CanManage { get; set; }
        public bool CanBuild { get; set; }
        public bool CanRelease { get; set; }

        /// <summary>
        /// Alias CanRead to CanView for backwards compatibility with general module checkers.
        /// </summary>
        public bool CanRead
        {
            get => CanView;
            set => CanView = value;
        }
    }

    public class AppPermissionsMap
    {
        public ModulePermissions Analytics { get; set; } = new ModulePermissions();
        public ModulePermissions Articles { get; set; } = new ModulePermissions();
        public ModulePermissions Customers { get; set; } = new ModulePermissions();
        public ModulePermissions Providers { get; set; } = new ModulePermissions();
        public ModulePermissions Purchases { get; set; } = new ModulePermissions();
        public ModulePermissions Sales { get; set; } = new ModulePermissions();
        public ModulePermissions Stock { get; set; } = new ModulePermissions();
        public ModulePermissions Inventory { get; set; } = new ModulePermissions();
        public ModulePermissions Accounting { get; set; } = new ModulePermissions();
        public ModulePermissions Vehicles { get; set; } = new ModulePermissions();
        public ModulePermissions HR { get; set; } = new ModulePermissions();
        public ModulePermissions Configuration { get; set; } = new ModulePermissions();
        public ModulePermissions Chantier { get; set; } = new ModulePermissions();
        public ModulePermissions Production { get; set; } = new ModulePermissions();
        public MobileAppPermissions MobileApp { get; set; } = new MobileAppPermissions();
    }
}
