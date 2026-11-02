import { keepPreviousData } from '@tanstack/react-query';
import type { ReactQueryOptions } from '@/lib/types';
import { useApi } from '../useApi';
import { useDateParameters } from '../useDateParameters';
import { useFilterParameters } from '../useFilterParameters';

export type WebsiteMetricsData = {
  x: string;
  y: number;
}[];

export function useWebsiteMetricsQuery(
  websiteId: string,
  params: { type: string; limit?: number; search?: string },
  options?: ReactQueryOptions<WebsiteMetricsData>,
) {
  const { get, useQuery } = useApi();
  const { startAt, endAt } = useDateParameters();
  const filters = useFilterParameters();
  // The table and map use the same country totals. Keep the full result in the
  // query cache and apply each table's row limit only to its selected data.
  const queryParams = params.type === 'country' ? { ...params, limit: 500 } : params;

  return useQuery<WebsiteMetricsData>({
    queryKey: [
      'websites:metrics',
      {
        websiteId,
        startAt,
        endAt,
        ...filters,
        ...queryParams,
      },
    ],
    queryFn: async () =>
      get(`/websites/${websiteId}/metrics`, {
        startAt,
        endAt,
        ...filters,
        ...queryParams,
      }),
    enabled: !!websiteId,
    placeholderData: keepPreviousData,
    select:
      params.type === 'country' && params.limit !== undefined
        ? data => data.slice(0, params.limit)
        : undefined,
    ...options,
  });
}
