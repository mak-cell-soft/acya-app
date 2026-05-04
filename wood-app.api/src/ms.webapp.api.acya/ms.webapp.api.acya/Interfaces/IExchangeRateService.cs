using System.Threading.Tasks;

namespace ms.webapp.api.acya.api.Interfaces
{
    public interface IExchangeRateService
    {
        Task<double> GetExchangeRateAsync(string fromCurrency, string toCurrency);
    }
}
