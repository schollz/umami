import { expect, test, vi } from 'vitest';
import { getTestRouter } from '@/test/navigation';
import { render, screen } from '@/test/render';
import { TopNav } from './TopNav';

const route = '/websites/11111111-1111-4111-8111-111111111111';

vi.mock('@/components/input/TeamsButton', () => ({
  TeamsButton: () => <div>TeamsButton</div>,
}));

vi.mock('@/components/input/WebsiteSelect', () => ({
  WebsiteSelect: ({ onChange }: { onChange: (value: string | number | null) => void }) => (
    <>
      <button type="button" onClick={() => onChange(null)}>
        clear website
      </button>
      <button type="button" onClick={() => onChange('website-2')}>
        select website
      </button>
    </>
  ),
}));

vi.mock('@/components/input/LinkSelect', () => ({
  LinkSelect: () => null,
}));

vi.mock('@/components/input/PixelSelect', () => ({
  PixelSelect: () => null,
}));

vi.mock('@/components/input/BoardSelect', () => ({
  BoardSelect: () => null,
}));

test('does not navigate when the website select emits null', async () => {
  const { user } = render(<TopNav />, { route });

  await user.click(screen.getByRole('button', { name: 'clear website' }));

  expect(getTestRouter().push).not.toHaveBeenCalled();
});

test('navigates when the website select emits a website id', async () => {
  const { user } = render(<TopNav />, { route });

  await user.click(screen.getByRole('button', { name: 'select website' }));

  expect(getTestRouter().push).toHaveBeenCalledWith('/websites/website-2');
});
