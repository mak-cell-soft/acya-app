using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Permissions;
using ms.webapp.api.acya.infrastructure.Core;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class UserPermissionsRepository : CoreRepository<UserPermissions, WoodAppContext>
    {
        public UserPermissionsRepository(WoodAppContext context) : base(context)
        {
        }

        public async Task<UserPermissions?> GetByUserIdAsync(int userId)
        {
            return await context.UserPermissions
                .FirstOrDefaultAsync(x => x.UserId == userId);
        }

        public async Task<UserPermissions> UpsertAsync(int userId, string permissionsJson)
        {
            var existing = await context.UserPermissions.FirstOrDefaultAsync(x => x.UserId == userId);
            
            if (existing != null)
            {
                existing.Permissions = permissionsJson;
                existing.UpdatedAt = DateTime.UtcNow;
                context.UserPermissions.Update(existing);
            }
            else
            {
                existing = new UserPermissions
                {
                    UserId = userId,
                    Permissions = permissionsJson,
                    UpdatedAt = DateTime.UtcNow
                };
                await context.UserPermissions.AddAsync(existing);
            }

            await context.SaveChangesAsync();
            return existing;
        }
    }
}
