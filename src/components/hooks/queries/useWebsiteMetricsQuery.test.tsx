import type { ReactNode } from 'react';
import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/render';
import { useWebsiteMetricsQuery } from './useWebsiteMetricsQuery';

const requests = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@umami/react-zen', () => ({
  ZenProvider: ({ children }: { children: ReactNode }) => children,
  RouterProvider: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('../useApi', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return { useApi: () => ({ get: requests.get, useQuery }) };
});

vi.mock('../useDateParameters', () => ({
  useDateParameters: () => ({ startAt: 1, endAt: 2 }),
}));

vi.mock('../useFilterParameters', () => ({ useFilterParameters: () => ({}) }));

const countries = [
  { x: 'US', y: 30 },
  { x: 'DE', y: 20 },
  { x: 'FR', y: 10 },
];

function Metrics({ type = 'country', secondWebsite = 'website-1', limit = 1 }) {
  const table = useWebsiteMetricsQuery('website-1', { type, limit });
  const map = useWebsiteMetricsQuery(secondWebsite, { type });

  return (
    <>
      <div>Table rows: {table.data?.length ?? 'loading'}</div>
      <div>Map rows: {map.data?.length ?? 'loading'}</div>
    </>
  );
}

beforeEach(() => {
  requests.get.mockReset().mockResolvedValue(countries);
});

test.each([0, 1])('shares country totals while preserving the table limit of %i', async limit => {
  render(<Metrics limit={limit} />);

  await waitFor(() => expect(screen.getByText(`Table rows: ${limit}`)).toBeVisible());
  expect(screen.getByText('Map rows: 3')).toBeVisible();
  expect(requests.get).toHaveBeenCalledExactlyOnceWith('/websites/website-1/metrics', {
    startAt: 1,
    endAt: 2,
    type: 'country',
    limit: 500,
  });
});

test('does not share country totals across websites', async () => {
  render(<Metrics secondWebsite="website-2" />);

  await waitFor(() => expect(screen.getByText('Map rows: 3')).toBeVisible());
  expect(requests.get).toHaveBeenCalledTimes(2);
  expect(requests.get.mock.calls.map(([url]) => url)).toEqual([
    '/websites/website-1/metrics',
    '/websites/website-2/metrics',
  ]);
});

test('keeps independent request limits for other metric types', async () => {
  render(<Metrics type="browser" />);

  await waitFor(() => expect(screen.getByText('Map rows: 3')).toBeVisible());
  expect(requests.get).toHaveBeenCalledTimes(2);
  expect(requests.get.mock.calls.map(([, params]) => params.limit)).toEqual([1, undefined]);
});
