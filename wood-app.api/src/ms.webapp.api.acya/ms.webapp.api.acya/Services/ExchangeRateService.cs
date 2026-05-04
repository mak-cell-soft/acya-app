using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using ms.webapp.api.acya.api.Interfaces;

namespace ms.webapp.api.acya.api.Services
{
    public class ExchangeRateService : IExchangeRateService
    {
        private readonly HttpClient _httpClient;

        public ExchangeRateService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<double> GetExchangeRateAsync(string fromCurrency, string toCurrency)
        {
            if (string.IsNullOrEmpty(fromCurrency) || string.IsNullOrEmpty(toCurrency))
                return 1.0;

            if (fromCurrency.Equals(toCurrency, StringComparison.OrdinalIgnoreCase))
                return 1.0;

            try
            {
                // Using a free API that doesn't require a key for basic latest rates
                // Note: In production, consider a more robust API with an API Key
                var response = await _httpClient.GetAsync($"https://api.exchangerate-api.com/v4/latest/{fromCurrency.ToUpper()}");
                
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);
                    
                    if (doc.RootElement.TryGetProperty("rates", out var rates) && 
                        rates.TryGetProperty(toCurrency.ToUpper(), out var rate))
                    {
                        return rate.GetDouble();
                    }
                }
            }
            catch (Exception ex)
            {
                // Log exception in a real scenario
                Console.WriteLine($"Error fetching exchange rate: {ex.Message}");
            }

            // Fallback rates for common pairs if API fails (TND based)
            return GetFallbackRate(fromCurrency, toCurrency);
        }

        private double GetFallbackRate(string from, string to)
        {
            // Simple hardcoded fallback for demo/safety
            if (from.Equals("EUR", StringComparison.OrdinalIgnoreCase) && to.Equals("TND", StringComparison.OrdinalIgnoreCase)) return 3.35;
            if (from.Equals("USD", StringComparison.OrdinalIgnoreCase) && to.Equals("TND", StringComparison.OrdinalIgnoreCase)) return 3.10;
            if (from.Equals("TND", StringComparison.OrdinalIgnoreCase) && to.Equals("EUR", StringComparison.OrdinalIgnoreCase)) return 0.30;
            if (from.Equals("TND", StringComparison.OrdinalIgnoreCase) && to.Equals("USD", StringComparison.OrdinalIgnoreCase)) return 0.32;

            return 1.0;
        }
    }
}
