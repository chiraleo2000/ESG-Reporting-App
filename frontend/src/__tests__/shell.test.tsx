import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import pkg from '../../package.json';
import { MainNav } from '@/components/layout/MainNav';
import { DataSources } from '@/pages/DataSources';
import { useAppStore } from '@/store/appStore';

function mount(node: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return { container, root };
}

describe('light shell', () => {
  it('does not depend on framer-motion', () => {
    expect((pkg.dependencies as Record<string, string>)['framer-motion']).toBeUndefined();
    const activities = readFileSync(resolve(__dirname, '../pages/Activities.tsx'), 'utf8');
    expect(activities).not.toContain("from 'framer-motion'");
    expect(activities).not.toContain("from 'recharts'");
  });

  it('exposes seven primary tabs and moves with the arrow keys', () => {
    const { container } = mount(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MainNav />
      </MemoryRouter>
    );
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(7);
    expect(tabs[0].textContent).toContain('Home');
    expect(tabs[5].textContent).toContain('Connect');
    const list = container.querySelector('[role="tablist"]') as HTMLElement;
    act(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(container.querySelector('[aria-selected="true"]')?.textContent).toContain('Measure');
  });
});

describe('connection wizard', () => {
  let root: Root | undefined;

  beforeEach(() => {
    useAppStore.setState({
      currentProject: {
        id: 'proj-1',
        name: 'Demo',
        baselineYear: 2023,
        reportingYear: 2024,
        status: 'active',
        standards: [],
        createdAt: '',
        updatedAt: '',
      },
      projects: [],
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: false, message: 'Connection refused' }),
    }));
  });

  it('keeps save disabled until a connection test succeeds', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(<DataSources />);
    });
    const card = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Website or REST API'));
    await act(async () => {
      card?.click();
    });
    const save = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Save connection')) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    const test = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Test connection'));
    await act(async () => {
      test?.click();
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Connection refused');
    expect(save.disabled).toBe(true);
    root.unmount();
  });
});
