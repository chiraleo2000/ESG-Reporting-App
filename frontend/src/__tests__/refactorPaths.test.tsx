import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routePurpose } from '@/components/layout/MainNav';
import { FileUpload } from '@/components/ui/FileUpload';

const project = { id: 'p1', name: 'Demo', status: 'active' };
const activity = {
  id: 'a1',
  name: 'Boiler',
  description: 'Gas boiler',
  activityType: 'stationary_combustion',
  quantity: 10,
  unit: 'l',
  scope: 'scope1',
  calculationStatus: 'calculated',
  totalEmissionsKgCo2e: 5000,
  createdAt: '2026-01-15T00:00:00.000Z',
};

vi.mock('@/lib/api', () => ({
  healthCheck: vi.fn().mockResolvedValue(true),
  authApi: {
    login: vi.fn().mockResolvedValue({
      success: true,
      data: {
        mfaRequired: true,
        mfaToken: 'mfa-token',
        user: { id: 'u1', email: 'a@b.co', name: 'Ada', role: 'editor' },
      },
    }),
    register: vi.fn().mockResolvedValue({ success: true, data: { id: 'u1' } }),
    verifyMfa: vi.fn().mockResolvedValue({
      success: true,
      data: {
        token: 'access',
        refreshToken: 'refresh',
        user: { id: 'u1', email: 'a@b.co', name: 'Ada', role: 'editor' },
      },
    }),
  },
  projectsApi: {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [project] }),
  },
  activitiesApi: {
    getAll: vi.fn().mockResolvedValue({ success: true, data: [activity] }),
    getByProject: vi.fn().mockResolvedValue({
    success: true,
    data: [activity, { ...activity, id: 'a2', description: undefined, totalEmissionsKgCo2e: 0, calculationStatus: 'pending' }],
  }),
    create: vi.fn().mockResolvedValue({ success: true, data: activity }),
    export: vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['activities']) }),
  },
  calculationsApi: {
    getTotals: vi.fn().mockResolvedValue({
      success: true,
      data: {
        scope1: 12000,
        scope2: 8000,
        scope3: 4000,
        scope3Categories: { purchased_goods: 1000 },
        activityCount: 2,
        calculatedCount: 1,
      },
    }),
  },
  reportsApi: {
    getByProject: vi.fn().mockResolvedValue({ success: true, data: [{ id: 'r1' }] }),
    download: vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['report']) }),
  },
  goalsApi: {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      data: [{
        category: 'emissions_reduction',
        target_value: 10,
        target_year: 2030,
        current_value: 4,
        status: 'on_track',
        progress: 40,
      }],
    }),
  },
  emissionFactorsApi: {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      data: [
        { id: 'g1', activity_type: 'grid electricity', category: 'grid', unit: 'kWh', factor: 0.4, region: 'TH', year: 2025, source: 'EGAT' },
        { id: 'f1', activity_type: 'diesel', category: 'fuel', unit: 'l', factor: 2.68, scope: '1', source: 'DEFRA' },
        { id: 'm1', activity_type: 'steel', category: 'materials', unit: 't', factor: 1.9, source: 'CBAM' },
      ],
    }),
  },
}));

function mount(node: React.ReactNode) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

async function render(node: React.ReactNode) {
  const view = mount(node);
  await act(async () => {
    view.root.render(node);
  });
  await act(async () => {
    await Promise.resolve();
  });
  return view;
}

function unmount(view: { root: { unmount: () => void } }) {
  act(() => {
    view.root.unmount();
  });
}

describe('refactored paths', () => {
  beforeEach(() => {
    URL.createObjectURL = () => 'blob:mock';
    URL.revokeObjectURL = () => undefined;
  });

  it('keeps route purposes specific before general prefixes', () => {
    expect(routePurpose('/calculations/history')).toContain('already saved');
    expect(routePurpose('/calculations')).toContain('Run a calculation');
    expect(routePurpose('/analytics/trends')).toContain('reporting periods');
    expect(routePurpose('/unknown')).toContain('project selected');
  });

  it('renders the refactored screens and runs their data paths', async () => {
    const { Login } = await import('../pages/Login');
    const { Dashboard } = await import('../pages/Dashboard');
    const { Analytics } = await import('../pages/Analytics');
    const { Activities } = await import('../pages/Activities');
    const { EmissionFactors } = await import('../pages/EmissionFactors');
    const { DataExport } = await import('../pages/DataExport');

    const { authApi, healthCheck } = await import('@/lib/api');
    vi.mocked(authApi.register)
      .mockResolvedValueOnce({ success: false, error: 'taken' })
      .mockResolvedValueOnce({ success: true, data: { id: 'u1' } } as never);
    vi.mocked(authApi.login)
      .mockResolvedValueOnce({ success: false, error: 'bad' })
      .mockResolvedValueOnce({
        success: true,
        data: { token: 'access', refreshToken: 'refresh', user: { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'editor' } },
      } as never)
      .mockResolvedValue({
        success: true,
        data: { mfaRequired: true, mfaToken: 'mfa-token', user: { id: 'u1', email: 'ada@example.com', name: 'Ada', role: 'editor' } },
      } as never);

    const login = await render(<MemoryRouter><Login /></MemoryRouter>);
    const setValue = (element: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const submit = () => login.container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await act(async () => {
      setValue(login.container.querySelector('#login-name') as HTMLInputElement, 'Ada Lovelace');
      setValue(login.container.querySelector('#login-email') as HTMLInputElement, 'ada@example.com');
      setValue(login.container.querySelector('#login-password') as HTMLInputElement, 'secret1');
      setValue(login.container.querySelector('#login-confirm') as HTMLInputElement, 'secret1');
    });
    await act(async () => { submit(); });
    expect(login.container.textContent).toContain('taken');
    await act(async () => { submit(); });
    expect(login.container.textContent).toContain('Account created');

    const password = () => login.container.querySelector('#login-password') as HTMLInputElement;
    await act(async () => {
      setValue(password(), 'secret1');
      submit();
    });
    expect(login.container.textContent).toContain('bad');
    await act(async () => {
      setValue(password(), 'secret1');
      submit();
    });
    await act(async () => {
      setValue(password(), 'secret1');
      submit();
    });
    expect(login.container.textContent).toContain('Two-step verification');
    await act(async () => { submit(); });
    expect(login.container.textContent).toContain('Enter your 6-digit code');

    vi.mocked(healthCheck).mockResolvedValueOnce(false);
    const offline = await render(<MemoryRouter><Login /></MemoryRouter>);
    await act(async () => { await Promise.resolve(); });
    expect(offline.container.textContent).toContain('Server Offline');
    unmount(offline);

    const dashboard = await render(<MemoryRouter><Dashboard /></MemoryRouter>);
    const analytics = await render(<MemoryRouter><Analytics /></MemoryRouter>);
    const activities = await render(<MemoryRouter><Activities /></MemoryRouter>);
    const factors = await render(<MemoryRouter><EmissionFactors /></MemoryRouter>);
    await act(async () => {
      factors.container.querySelectorAll('button').forEach((button) => {
        if (button.textContent === 'Fuel' || button.textContent === 'Materials') button.click();
      });
    });
    const search = activities.container.querySelector('input[placeholder="Search activities..."]') as HTMLInputElement | null;
    if (search) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      await act(async () => {
        setter?.call(search, 'zzzz-no-match');
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
    unmount(dashboard);
    unmount(analytics);
    unmount(activities);
    unmount(factors);

    const exported = await render(<MemoryRouter><DataExport /></MemoryRouter>);
    const clickLabel = (text: string) => {
      const node = Array.from(exported.container.querySelectorAll('p')).find((item) => item.textContent === text);
      node?.click();
    };
    const projectSelect = exported.container.querySelector('select') as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(projectSelect, 'p1');
      projectSelect.dispatchEvent(new Event('change', { bubbles: true }));
      clickLabel('Emission Factors');
    });
    const exportButton = () => Array.from(exported.container.querySelectorAll('button')).find((button) => button.textContent?.includes('Export Selected Data'));
    await act(async () => {
      exportButton()?.click();
      await Promise.resolve();
    });
    await act(async () => {
      clickLabel('Emission Factors');
      clickLabel('Activities Data');
      clickLabel('Generated Reports');
    });
    await act(async () => {
      exportButton()?.click();
      await Promise.resolve();
    });

    const upload = await render(<FileUpload onUpload={async () => undefined} />);
    const input = upload.container.querySelector('input[type="file"]') as HTMLInputElement;
    const small = new File(['a'], 'photo.png', { type: 'image/png' });
    const huge = new File([new Uint8Array(11 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    vi.useFakeTimers();
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [small, huge] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await vi.advanceTimersByTimeAsync(1300);
    });
    vi.useRealTimers();
    expect(upload.container.textContent).toContain('photo.png');
    unmount(login);
    unmount(exported);
    unmount(upload);
  }, 90000);
});
