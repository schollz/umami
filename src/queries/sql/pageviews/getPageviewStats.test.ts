import { afterEach, expect, test, vi } from 'vitest';

async function loadModule(
  mode: 'prisma' | 'clickhouse',
  rows = [{ x: '2026-11-01T00:00:00Z', pageviews: 5, sessions: 2 }],
) {
  vi.resetModules();
  const rawQuery = vi.fn().mockResolvedValue(rows);
  const parseFilters = vi.fn().mockReturnValue({
    queryParams: { websiteId: 'website-1' },
    filterQuery: 'and filtered_events',
    joinSessionQuery: 'join session using (session_id)',
    cohortQuery: 'join cohort using (session_id)',
    excludeBounceQuery: 'join non_bounces using (visit_id)',
  });
  vi.doMock('@/lib/db', () => ({
    PRISMA: 'prisma',
    CLICKHOUSE: 'clickhouse',
    runQuery: (queries: Record<string, () => unknown>) => queries[mode](),
  }));
  const backend = {
    rawQuery,
    parseFilters,
    getDateSQL: () => 'date_bucket',
  };
  vi.doMock('@/lib/prisma', () => ({ default: backend }));
  vi.doMock('@/lib/clickhouse', () => ({ default: backend }));
  const { getPageviewStats } = await import('./getPageviewStats');
  return { getPageviewStats, rawQuery, parseFilters };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

test('returns both chart series from one PostgreSQL query with all filters intact', async () => {
  const { getPageviewStats, rawQuery, parseFilters } = await loadModule('prisma');
  const filters = { path: '/pricing', country: 'DE', excludeBounce: true };

  await expect(getPageviewStats('website-1', filters)).resolves.toEqual({
    pageviews: [{ x: '2026-11-01T00:00:00Z', y: 5 }],
    sessions: [{ x: '2026-11-01T00:00:00Z', y: 2 }],
  });

  expect(rawQuery).toHaveBeenCalledTimes(1);
  expect(parseFilters).toHaveBeenCalledWith({ ...filters, websiteId: 'website-1' });
  const query = rawQuery.mock.calls[0][0];
  expect(query).toContain('count(*) as pageviews');
  expect(query).toContain('count(distinct website_event.session_id) as sessions');
  expect(query).toContain('join session using (session_id)');
  expect(query).toContain('join cohort using (session_id)');
  expect(query).toContain('join non_bounces using (visit_id)');
  expect(query).toContain('and filtered_events');
  expect(query).toContain('event_type NOT IN (2, 5)');
});

test.each([{ path: '/pricing' }, { unit: 'minute' }])(
  'counts both series from raw ClickHouse events when required by %j',
  async filters => {
    const { getPageviewStats, rawQuery } = await loadModule('clickhouse');

    await getPageviewStats('website-1', filters);

    expect(rawQuery).toHaveBeenCalledTimes(1);
    const query = rawQuery.mock.calls[0][0];
    expect(query).toContain('count(*) as pageviews');
    expect(query).toContain('count(distinct session_id) as sessions');
    expect(query).not.toContain('website_event_stats_hourly');
  },
);

test('uses ClickHouse hourly rollups for both series when possible', async () => {
  const { getPageviewStats, rawQuery } = await loadModule('clickhouse');

  await getPageviewStats('website-1', {});

  const query = rawQuery.mock.calls[0][0];
  expect(query).toContain('website_event_stats_hourly');
  expect(query).toContain('sum(views) as pageviews');
  expect(query).toContain('uniq(session_id) as sessions');
});

test('returns two empty series when no pageviews match', async () => {
  const { getPageviewStats } = await loadModule('prisma', []);

  await expect(getPageviewStats('website-1', {})).resolves.toEqual({
    pageviews: [],
    sessions: [],
  });
});
