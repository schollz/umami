import type { ReactNode } from 'react';
import { expect, test, vi } from 'vitest';
import { render, screen } from '@/test/render';
import { LoadingPanel } from './LoadingPanel';

vi.mock('@umami/react-zen', () => ({
  ZenProvider: ({ children }: { children: ReactNode }) => children,
  RouterProvider: ({ children }: { children: ReactNode }) => children,
  Column: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Loading: () => <div role="status">Loading</div>,
}));

vi.mock('./ErrorMessage', () => ({
  ErrorMessage: () => <div role="alert">Something went wrong.</div>,
}));

vi.mock('./Empty', () => ({
  Empty: () => <div>No data available.</div>,
}));

test('shows loading before the first result is available', () => {
  render(<LoadingPanel isLoading>Statistics</LoadingPanel>);

  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
});

test('shows an error when the initial request fails', () => {
  render(<LoadingPanel error={new Error('Connection terminated')}>Statistics</LoadingPanel>);

  expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong.');
});

test('keeps the last successful result visible during a refresh and a refresh failure', () => {
  const { rerender } = render(
    <LoadingPanel data={{ visitors: 41200 }}>41,200 visitors</LoadingPanel>,
  );

  rerender(
    <LoadingPanel data={{ visitors: 41200 }} isFetching>
      41,200 visitors
    </LoadingPanel>,
  );
  expect(screen.getByText('41,200 visitors')).toBeVisible();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();

  rerender(
    <LoadingPanel data={{ visitors: 41200 }} error={new Error('Connection terminated')}>
      41,200 visitors
    </LoadingPanel>,
  );
  expect(screen.getByText('41,200 visitors')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('retains a successful empty result when a background refresh fails', () => {
  render(
    <LoadingPanel data={[]} error={new Error('Connection terminated')}>
      Statistics
    </LoadingPanel>,
  );

  expect(screen.getByText('No data available.')).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('renders children without a data prop when loading is finished', () => {
  render(<LoadingPanel>Statistics</LoadingPanel>);

  expect(screen.getByText('Statistics')).toBeVisible();
});
