import { beforeEach, expect, test, vi } from 'vitest';
import { getCompareDate } from '@/lib/date';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getWebsiteStats } from '@/queries/sql';
import type { WebsiteStatsData } from '@/queries/sql/getWebsiteStats';
import { GET } from './route';

vi.mock('@/lib/request', () => ({
  getQueryFilters: vi.fn(),
  parseRequest: vi.fn(),
}));

vi.mock('@/permissions', () => ({
  canViewWebsiteSection: vi.fn(),
}));

vi.mock('@/queries/sql', () => ({
  getWebsiteStats: vi.fn(),
}));

const parseRequestMock = vi.mocked(parseRequest);
const getQueryFiltersMock = vi.mocked(getQueryFilters);
const canViewWebsiteSectionMock = vi.mocked(canViewWebsiteSection);
const getWebsiteStatsMock = vi.mocked(getWebsiteStats);

const filters = {
  startDate: new Date('2026-08-05T00:00:00Z'),
  endDate: new Date('2026-11-02T23:59:59Z'),
  path: '/pricing',
  country: 'DE',
  excludeBounce: true,
};

const stats: WebsiteStatsData = {
  pageviews: 100,
  visitors: 40,
  visits: 50,
  bounces: 0,
  totaltime: 1200,
};

function requestStats() {
  return GET(new Request('http://localhost/api/websites/website-1/stats'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  parseRequestMock.mockResolvedValue({ auth: {}, query: {}, error: undefined });
  canViewWebsiteSectionMock.mockResolvedValue(true);
  getQueryFiltersMock.mockResolvedValue(filters);
});

test('finishes the current period before starting the comparison to limit database load', async () => {
  const current = Promise.withResolvers<WebsiteStatsData>();
  const comparison = { ...stats, pageviews: 75, visitors: 30 };
  getWebsiteStatsMock.mockReturnValueOnce(current.promise).mockResolvedValueOnce(comparison);

  const responsePromise = requestStats();

  try {
    await vi.waitFor(() => expect(getWebsiteStatsMock).toHaveBeenCalledTimes(1));
    expect(getWebsiteStatsMock).toHaveBeenNthCalledWith(1, 'website-1', filters);
  } finally {
    current.resolve(stats);
  }

  const response = await responsePromise;
  const { startDate, endDate } = getCompareDate('prev', filters.startDate, filters.endDate);
  expect(getWebsiteStatsMock).toHaveBeenNthCalledWith(2, 'website-1', {
    ...filters,
    startDate,
    endDate,
  });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ...stats, comparison });
});

test('uses the requested year-over-year comparison while preserving filters', async () => {
  getQueryFiltersMock.mockResolvedValue({ ...filters, compare: 'yoy' });
  getWebsiteStatsMock.mockResolvedValue(stats);

  await requestStats();

  expect(getWebsiteStatsMock).toHaveBeenNthCalledWith(2, 'website-1', {
    ...filters,
    compare: 'yoy',
    startDate: new Date('2025-08-05T00:00:00Z'),
    endDate: new Date('2025-11-02T23:59:59Z'),
  });
});

test('does not run statistics queries when request validation fails', async () => {
  parseRequestMock.mockResolvedValue({
    error: () => Response.json({ error: 'invalid date range' }, { status: 400 }),
  });

  const response = await requestStats();

  expect(response.status).toBe(400);
  expect(getWebsiteStatsMock).not.toHaveBeenCalled();
});

test('does not run statistics queries without website access', async () => {
  canViewWebsiteSectionMock.mockResolvedValue(false);

  const response = await requestStats();

  expect(response.status).toBe(401);
  expect(getQueryFiltersMock).not.toHaveBeenCalled();
  expect(getWebsiteStatsMock).not.toHaveBeenCalled();
});
