import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@umami/react-zen';
import { useEffect, useRef, useTransition } from 'react';
import { getAllTimeDateRangeValue } from '@/lib/date';
import { buildPath } from '@/lib/url';
import { useApi } from './useApi';
import { useMessages } from './useMessages';
import { useNavigation } from './useNavigation';
import { useWebsiteNavItems } from './useWebsiteNavItems';

export function useWebsiteSwitch() {
  const { websiteId, pathname, query, router, renderUrl } = useNavigation();
  const { items } = useWebsiteNavItems(websiteId);
  const { get } = useApi();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, messages } = useMessages();
  const [isSwitching, startTransition] = useTransition();
  const activeRequest = useRef<object | null>(null);

  // Discard a pending lookup if the user navigates elsewhere or changes the view.
  useEffect(() => {
    return () => {
      activeRequest.current = null;
    };
  }, [pathname, query]);

  const switchWebsite = (value: string | number | null) => {
    if (
      value === null ||
      value === undefined ||
      value === '' ||
      String(value) === websiteId ||
      activeRequest.current ||
      isSwitching
    ) {
      return;
    }

    const destinationId = String(value);
    const section = items
      .flatMap(group => group.items)
      .find(({ id, path }) => {
        const sectionPath = path.split('?')[0];
        return (
          pathname === sectionPath ||
          ((id === 'sessions' || id === 'replays') && pathname.startsWith(`${sectionPath}/`))
        );
      });
    const path = section
      ? section.path.split('?')[0].replace(`/websites/${websiteId}`, `/websites/${destinationId}`)
      : renderUrl(`/websites/${destinationId}`, false);
    const params = {
      date: query.date,
      offset: query.offset,
      unit: query.unit,
      compare: query.compare,
    };
    const request = {};
    activeRequest.current = request;

    startTransition(async () => {
      try {
        if (params.date?.endsWith(':all')) {
          const range = await queryClient.fetchQuery<{
            startDate?: string;
            endDate?: string;
          }>({
            queryKey: ['date-range', destinationId],
            queryFn: () => get(`/websites/${destinationId}/daterange`),
            staleTime: 0,
            retry: false,
          });

          params.date = getAllTimeDateRangeValue(range?.startDate, range?.endDate);
          params.offset = undefined;
        }

        if (activeRequest.current === request) {
          startTransition(() => router.push(buildPath(path, params)));
        }
      } catch {
        if (activeRequest.current === request) {
          toast(t(messages.error));
        }
      } finally {
        if (activeRequest.current === request) {
          activeRequest.current = null;
        }
      }
    });
  };

  return { switchWebsite, isSwitching };
}
