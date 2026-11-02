import { beforeEach, expect, test, vi } from 'vitest';
import { getRealtimeActivity } from '@/queries/sql/getRealtimeActivity';
import { getPageviewStats } from '@/queries/sql/pageviews/getPageviewStats';
import { getRealtimeData } from './getRealtimeData';

vi.mock('@/queries/sql/getRealtimeActivity', () => ({ getRealtimeActivity: vi.fn() }));
vi.mock('@/queries/sql/pageviews/getPageviewStats', () => ({ getPageviewStats: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

test('preserves realtime series and totals using the combined chart query', async () => {
  vi.mocked(getRealtimeActivity).mockResolvedValue([]);
  const series = {
    pageviews: [{ x: '2026-11-01T00:00:00Z', y: 5 }],
    sessions: [{ x: '2026-11-01T00:00:00Z', y: 2 }],
  };
  vi.mocked(getPageviewStats).mockResolvedValue(series);

  const result = await getRealtimeData('website-1', { unit: 'minute' });

  expect(result.series).toEqual({ views: series.pageviews, visitors: series.sessions });
  expect(result.totals).toEqual({ views: 5, visitors: 2, events: 0, countries: 0 });
  expect(getPageviewStats).toHaveBeenCalledExactlyOnceWith('website-1', { unit: 'minute' });
});
