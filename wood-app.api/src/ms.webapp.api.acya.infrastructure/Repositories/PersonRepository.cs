using Microsoft.EntityFrameworkCore;
using ms.webapp.api.acya.core.Entities;
using ms.webapp.api.acya.core.Entities.Dtos;
using ms.webapp.api.acya.core.Entities.DTOs;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class PersonRepository : CoreRepository<Person, WoodAppContext>
  {
    public PersonRepository(WoodAppContext context) : base(context)
    {
    }

    public new async Task<IEnumerable<PersonDto>> GetAllAsync()
    {
      var allPersons = await context.Persons
          .Where(p => !p.IsDeleted)
          .Where(p => !p.IsAppUser)
          .ToListAsync();

      var allDtos = allPersons.Select(pers => new PersonDto(pers)).ToList();
      return allDtos;
    }

    public async Task<Person?> GetByCIN(string cin)
    {
      return await context.Persons.SingleOrDefaultAsync(pers => pers.Cin!.Equals(cin!));
    }
  }
}
