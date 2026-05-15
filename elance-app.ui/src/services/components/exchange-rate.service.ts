import api from '@/lib/axios';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const exchangeRateService = {
  getExchangeRate: async (from: string, to: string) => {
    const response = await api.get('/ExchangeRate', {
      params: { from, to }
    });
    return response.data;
  },

  getCurrencies: async (): Promise<Currency[]> => {
    return [
      { code: 'TND', name: 'Dinar Tunisien', symbol: 'DT' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'GBP', name: 'British Pound', symbol: '£' }
    ];
  }
};
