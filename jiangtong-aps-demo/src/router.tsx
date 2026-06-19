import { Navigate, Route, Routes } from 'react-router-dom';
import { Lock, Activity, AlertTriangle, Settings } from 'lucide-react';
import PlaceholderPage from './components/layout/PlaceholderPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import CostPage from './pages/CostPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import MaterialCheckPage from './pages/MaterialCheckPage';

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

      {/* Sprint 5-6 待开发 */}
      <Route path="/inventory-lock" element={<PlaceholderPage icon={Lock}           title="库存锁定" />} />
      <Route path="/capacity"       element={<PlaceholderPage icon={Activity}       title="产能负荷分析" />} />
      <Route path="/alerts"         element={<PlaceholderPage icon={AlertTriangle}  title="异常预警中心" />} />
      <Route path="/settings"       element={<PlaceholderPage icon={Settings}       title="系统设置" />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
