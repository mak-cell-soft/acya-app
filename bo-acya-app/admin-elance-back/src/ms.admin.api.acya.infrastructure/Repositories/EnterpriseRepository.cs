using Microsoft.EntityFrameworkCore;
using ms.admin.api.acya.core.Entities;
using ms.admin.api.acya.core.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace ms.admin.api.acya.infrastructure.Repositories
{
    public class EnterpriseRepository : IEnterpriseRepository
    {
        private readonly MasterDbContext _context;

        public EnterpriseRepository(MasterDbContext context)
        {
            _context = context;
        }

        public async Task<MasterEnterprise?> GetByIdAsync(long id)
        {
            return await _context.Enterprises.FindAsync(id);
        }

        public async Task<MasterEnterprise?> GetBySlugAsync(string slug)
        {
            return await _context.Enterprises.FirstOrDefaultAsync(x => x.Slug == slug);
        }

        public async Task<IEnumerable<MasterEnterprise>> GetAllAsync()
        {
            return await _context.Enterprises.ToListAsync();
        }

        public async Task<MasterEnterprise> AddAsync(MasterEnterprise enterprise)
        {
            await _context.Enterprises.AddAsync(enterprise);
            await _context.SaveChangesAsync();
            return enterprise;
        }

        public async Task UpdateAsync(MasterEnterprise enterprise)
        {
            _context.Enterprises.Update(enterprise);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(MasterEnterprise enterprise)
        {
            _context.Enterprises.Remove(enterprise);
            await _context.SaveChangesAsync();
        }
    }
}
