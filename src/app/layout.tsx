import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BottomBar } from '@/components/layout/BottomBar';
import { SimulationBanner } from '@/components/layout/SimulationBanner';
import { ToastContainer } from '@/components/ui/Toast';
import { useEngineData } from '@/hooks/useEngineData';

export function Layout() {
  const navigate = useNavigate();
  const { isSimulationMode } = useEngineData();

  useEffect(() => {
    const unsub = window.advancesafe?.events?.on('navigate', (path: unknown) => {
      if (typeof path === 'string') navigate(path);
    });
    return () => unsub?.();
  }, [navigate]);

  const handleDisableSimulation = () => {
    window.advancesafe?.engine?.setSimulationMode(false);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          {isSimulationMode && (
            <SimulationBanner onDisable={handleDisableSimulation} />
          )}
          <main className="min-h-0 flex-1 overflow-auto">
            <Outlet />
          </main>
          <BottomBar />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
