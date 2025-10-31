export interface AdminAnalyticsMock {
  dau: number;
  wau: number;
  mau: number;
  newUsers: number;
  topTraders: { wallet: string; trades: number; volume: number }[];
}

export const mockAdminAnalytics: AdminAnalyticsMock = {
  dau: 1234,
  wau: 5432,
  mau: 20123,
  newUsers: 89,
  topTraders: [
    { wallet: '7G...abc', trades: 142, volume: 1250000 },
    { wallet: '9H...def', trades: 97, volume: 830000 },
    { wallet: '3K...xyz', trades: 76, volume: 640000 },
  ],
};

