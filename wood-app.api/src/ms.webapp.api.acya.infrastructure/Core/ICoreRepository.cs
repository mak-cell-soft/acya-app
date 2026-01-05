using System.Linq.Expressions;
using ms.webapp.api.acya.core;

namespace ms.webapp.api.acya.infrastructure
{
  public interface ICoreRepository<T> where T : class, IEntity
    {
        Task<List<T>> GetAll();
        Task<T?> Get(int id);
        Task<T> Add(T entity);
        Task<T>? Update(T entity);
        Task<T> Delete(int id);
        IQueryable<T> FindByCondition(Expression<Func<T, bool>> expression);
    }
}
    