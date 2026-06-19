import { Navigate, Route, Routes } from 'react-router-dom';
import { ClipboardList, Boxes, Lock, Activity, AlertTriangle, Settings } from 'lucide-react';
import PlaceholderPage from './components/layout/PlaceholderPage';
import DashboardPage from './pages/DashboardPage';
import SchedulePage from './pages/SchedulePage';
import CostPage from './pages/CostPage';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ★ Sprint 1/2/3 重点页（当前为占位） */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/schedule"  element={<SchedulePage />} />
      <Route path="/cost"      element={<CostPage />} />

      {/* 骨架页（§4.2 统一） */}
      <Route path="/work-orders"    element={<PlaceholderPage icon={ClipboardList}  title="工单管理" />} />
      <Route path="/material-check" element={<PlaceholderPage icon={Boxes}          title="物料齐套" />} />
      <Route path="/inventory-lock" element={<PlaceholderPage icon={Lock}           title="库存锁定" />} />
      <Route path="/capacity"       element={<PlaceholderPage icon={Activity}       title="产能负荷分析" />} />
      <Route path="/alerts"         element={<PlaceholderPage icon={AlertTriangle}  title="异常预警中心" />} />
      <Route path="/settings"       element={<PlaceholderPage icon={Settings}       title="系统设置" />} />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
