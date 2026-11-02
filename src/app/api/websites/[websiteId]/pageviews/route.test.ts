import { beforeEach, expect, test, vi } from 'vitest';
import { getCompareDate } from '@/lib/date';
import { getQueryFilters, parseRequest } from '@/lib/request';
import { canViewWebsiteSection } from '@/permissions';
import { getPageviewStats } from '@/queries/sql';
import { GET } from './route';

vi.mock('@/lib/request', () => ({ parseRequest: vi.fn(), getQueryFilters: vi.fn() }));
vi.mock('@/permissions', () => ({ canViewWebsiteSection: vi.fn() }));
vi.mock('@/queries/sql', () => ({ getPageviewStats: vi.fn() }));

const filters = {
  startDate: new Date('2026-08-05T00:00:00Z'),
  endDate: new Date('2026-11-02T23:59:59Z'),
  path: '/pricing',
};
const series = {
  pageviews: [{ x: '2026-11-01', y: 5 }],
  sessions: [{ x: '2026-11-01', y: 2 }],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(parseRequest).mockResolvedValue({ auth: {}, query: {}, error: undefined });
  vi.mocked(canViewWebsiteSection).mockResolvedValue(true);
  vi.mocked(getQueryFilters).mockResolvedValue(filters);
  vi.mocked(getPageviewStats).mockResolvedValue(series);
});

function requestChart() {
  return GET(new Request('http://localhost/api/websites/website-1/pageviews'), {
    params: Promise.resolve({ websiteId: 'website-1' }),
  });
}

test('preserves the existing chart response with one query per period', async () => {
  const response = await requestChart();

  expect(getPageviewStats).toHaveBeenCalledExactlyOnceWith('website-1', filters);
  await expect(response.json()).resolves.toEqual(series);
});

test('preserves both comparison series and the requested date ranges', async () => {
  vi.mocked(getQueryFilters).mockResolvedValue({ ...filters, compare: 'prev' });
  const comparison = {
    pageviews: [{ x: '2026-08-01', y: 3 }],
    sessions: [{ x: '2026-08-01', y: 1 }],
  };
  vi.mocked(getPageviewStats).mockResolvedValueOnce(series).mockResolvedValueOnce(comparison);

  const response = await requestChart();

  expect(getPageviewStats).toHaveBeenCalledTimes(2);
  const { startDate, endDate } = getCompareDate('prev', filters.startDate, filters.endDate);
  expect(getPageviewStats).toHaveBeenNthCalledWith(2, 'website-1', {
    ...filters,
    compare: 'prev',
    startDate,
    endDate,
  });
  await expect(response.json()).resolves.toEqual({
    ...series,
    startDate: filters.startDate.toISOString(),
    endDate: filters.endDate.toISOString(),
    compare: { ...comparison, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
  });
});
