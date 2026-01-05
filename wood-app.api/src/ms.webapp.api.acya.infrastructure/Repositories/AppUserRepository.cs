using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.DTOs.Authentication;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class AppUserRepository : CoreRepository<AppUser, WoodAppContext>
  {
    public AppUserRepository(WoodAppContext context) : base(context)
    {
    }

    public new async Task<IEnumerable<AppUserDto>> GetAllAsync()
    {
      var allAppUsers = await context.AppUsers
          .Include(user => user.Persons)
          .Where(user => !user.Persons!.IsDeleted)
          .ToListAsync();

      var allDtos = allAppUsers.Select(user => new AppUserDto(user)).ToList();
      return allDtos;
    }

    public async Task<IEnumerable<AppUser>> GetAllAppUsersAsync()
    {
      return await context.AppUsers
          .Include(user => user.Persons)
          .Where(user => user.IsActive)
          .Where(user => !user.Persons!.IsDeleted)
          .ToListAsync();
    }

    public async Task<AppUserDto> GetById(int _id)
    {
      var appuser = await context.AppUsers
          .Include(user => user.Persons)
          .Where(user => user.Id! == _id)
          .SingleOrDefaultAsync();

      var appuserDto = new AppUserDto(appuser!);
      return appuserDto;
    }


    public async Task<AppUser?> GetByEmailAsync(string email)
    {
      return await context.AppUsers
                .Include(u => u.Persons)  
                .SingleOrDefaultAsync(u => u.Email! == email);
    }
  }
}
