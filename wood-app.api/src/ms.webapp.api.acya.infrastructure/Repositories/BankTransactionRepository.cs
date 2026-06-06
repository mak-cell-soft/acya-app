using ms.webapp.api.acya.core.Entities;


namespace ms.webapp.api.acya.infrastructure.Repositories
{
    public class BankTransactionRepository : CoreRepository<BankTransaction, WoodAppContext>
    {
        public BankTransactionRepository(WoodAppContext context) : base(context)
        {
        }
    }
}
