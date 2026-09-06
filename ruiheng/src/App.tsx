import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Shell, { fnsOf } from './components/Shell';
import Dashboard from './pages/Dashboard';
import { REGISTRY } from './functions/registry';
import FunctionPage from './pages/FunctionPage';

function FunctionDispatch() {
  const { fid } = useParams();
  const C = (fid && REGISTRY[fid]) || FunctionPage;
  return <C key={fid} />;
}

function ProductRedirect() {
  const { id } = useParams();
  const first = id ? fnsOf(id)[0] : undefined;
  return <Navigate to={first ? `/f/${first.id}` : '/'} replace />;
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/f/:fid" element={<FunctionDispatch />} />
        <Route path="/p/:id" element={<ProductRedirect />} />
        <Route path="/scene/postloan" element={<Navigate to="/f/F-FX-001" replace />} />
        <Route path="/scene/visit" element={<Navigate to="/f/F-KH-002" replace />} />
        <Route path="/scene/fin" element={<Navigate to="/f/F-ZY-005" replace />} />
        <Route path="/scene/credit" element={<Navigate to="/f/F-FX-005" replace />} />
        <Route path="/scene/group" element={<Navigate to="/f/F-KH-021" replace />} />
        <Route path="/scene/sparring" element={<Navigate to="/f/F-SY-007" replace />} />
        <Route path="/scene/profile" element={<Navigate to="/f/F-SY-018" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
