import { LoadingPanel } from '@/components/common/LoadingPanel';
import { useDateRange, useMessages } from '@/components/hooks';
import { useWebsiteStatsQuery } from '@/components/hooks/queries/useWebsiteStatsQuery';
import { useDateParameters } from '@/components/hooks/useDateParameters';
import { MetricCard } from '@/components/metrics/MetricCard';
import { MetricsBar } from '@/components/metrics/MetricsBar';
import { getCompareDate } from '@/lib/date';
import { estimateYearlyUsers } from '@/lib/estimate-yearly-users';
import { formatLongNumber, formatShortTime } from '@/lib/format';
import enUS from '../../../../../public/intl/messages/en-US.json';

export function WebsiteMetricsBar({
  websiteId,
  compareMode,
}: {
  websiteId: string;
  showChange?: boolean;
  compareMode?: boolean;
}) {
  const { isAllTime, dateCompare } = useDateRange();
  const { startAt, endAt } = useDateParameters();
  const { t, labels, messages, getErrorMessage } = useMessages();
  const compare = compareMode ? dateCompare?.compare : undefined;
  const { data, isLoading, isFetching, error } = useWebsiteStatsQuery({
    websiteId,
    compare,
  });

  const { pageviews, visitors, visits, bounces, totaltime, comparison } = data || {};
  const now = Date.now();
  const { startDate: compareStartDate, endDate: compareEndDate } = getCompareDate(
    compare ?? 'prev',
    new Date(startAt),
    new Date(endAt),
  );
  const yearlyUsers = estimateYearlyUsers(visitors ?? 0, startAt, endAt, now);
  const previousYearlyUsers = estimateYearlyUsers(
    comparison?.visitors ?? 0,
    compareStartDate?.getTime() ?? Number.NaN,
    compareEndDate?.getTime() ?? Number.NaN,
    now,
  );

  const metrics = data
    ? [
        {
          value: visitors,
          label: t(labels.visitors),
          change: visitors - comparison.visitors,
          formatValue: formatLongNumber,
        },
        {
          value: visits,
          label: t(labels.visits),
          change: visits - comparison.visits,
          formatValue: formatLongNumber,
        },
        {
          value: pageviews,
          label: t(labels.views),
          change: pageviews - comparison.pageviews,
          formatValue: formatLongNumber,
        },
        {
          label: t(labels.bounceRate),
          value: (Math.min(visits, bounces) / visits) * 100,
          prev: (Math.min(comparison.visits, comparison.bounces) / comparison.visits) * 100,
          change:
            (Math.min(visits, bounces) / visits) * 100 -
            (Math.min(comparison.visits, comparison.bounces) / comparison.visits) * 100,
          formatValue: n => `${Math.round(+n)}%`,
          reverseColors: true,
        },
        {
          label: t(labels.visitDuration),
          value: totaltime / visits,
          prev: comparison.totaltime / comparison.visits,
          change: totaltime / visits - comparison.totaltime / comparison.visits,
          formatValue: n =>
            `${+n < 0 ? '-' : ''}${formatShortTime(Math.abs(~~n), ['m', 's'], ' ')}`,
        },
        {
          label: t.has(labels.estYearlyUsers)
            ? t(labels.estYearlyUsers)
            : enUS.label['est-yearly-users'],
          value: yearlyUsers,
          prev: previousYearlyUsers,
          change: yearlyUsers - previousYearlyUsers,
          formatValue: formatLongNumber,
          tooltip: t.has(messages.estYearlyUsersDescription)
            ? t(messages.estYearlyUsersDescription)
            : enUS.message['est-yearly-users-description'],
        },
      ]
    : null;

  return (
    <LoadingPanel
      data={metrics}
      isLoading={isLoading}
      isFetching={isFetching}
      error={getErrorMessage(error)}
      minHeight="136px"
    >
      <MetricsBar columns="repeat(auto-fit, minmax(200px, 1fr))">
        {metrics?.map(({ label, value, prev, change, formatValue, reverseColors, tooltip }) => {
          return (
            <MetricCard
              key={label}
              value={value}
              previousValue={prev}
              label={label}
              tooltip={tooltip}
              change={change}
              formatValue={formatValue}
              reverseColors={reverseColors}
              showChange={!isAllTime}
            />
          );
        })}
      </MetricsBar>
    </LoadingPanel>
  );
}
