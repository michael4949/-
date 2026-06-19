import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import CostPage from './pages/CostPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import MaterialCheckPage from './pages/MaterialCheckPage';
import InventoryLockPage from './pages/InventoryLockPage';
import CapacityPage from './pages/CapacityPage';
import AlertsPage from './pages/AlertsPage';
import SettingsPage from './pages/SettingsPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ✅ Sprint 1-3 完成 */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/schedule"  element={<SchedulePage />} />
      <Route path="/cost"      element={<CostPage />} />

      {/* ★ Sprint 4 完成 */}
      <Route path="/work-orders"    element={<WorkOrdersPage />} />
      <Route path="/material-check" element={<MaterialCheckPage />} />

      {/* ★ Sprint 5 完成 */}
      <Route path="/inventory-lock" element={<InventoryLockPage />} />
      <Route path="/capacity"       element={<CapacityPage />} />

      {/* ★ Sprint 6 完成 · 9 菜单全部完整 */}
      <Route path="/alerts"         element={<AlertsPage />} />
      <Route path="/settings"       element={<SettingsPage />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
