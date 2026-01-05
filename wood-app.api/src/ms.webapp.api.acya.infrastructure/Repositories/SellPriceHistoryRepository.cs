using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using ms.webapp.api.acya.core.Entities.Product;

namespace ms.webapp.api.acya.infrastructure.Repositories
{
  public class SellPriceHistoryRepository : CoreRepository<SellPriceHistory, WoodAppContext>
  {
    public SellPriceHistoryRepository(WoodAppContext context) : base(context)
    {
    }
  }
}
