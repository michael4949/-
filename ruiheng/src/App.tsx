import { Routes, Route } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import ProductPage from './pages/ProductPage';
import CapabilityMap from './pages/CapabilityMap';
import Scenes from './pages/Scenes';
import Deploy from './pages/Deploy';
import Pathways from './pages/Pathways';
import FinDiagnosis from './scenes/FinDiagnosis';
import PostLoan from './scenes/PostLoan';
import CreditReport from './scenes/CreditReport';
import GroupWarRoom from './scenes/GroupWarRoom';
import Sparring from './scenes/Sparring';
import Profile from './scenes/Profile';
import VisitPrep from './scenes/VisitPrep';

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scenes" element={<Scenes />} />
        <Route path="/map" element={<CapabilityMap />} />
        <Route path="/p/:id" element={<ProductPage />} />
        <Route path="/scene/postloan" element={<PostLoan />} />
        <Route path="/scene/visit" element={<VisitPrep />} />
        <Route path="/scene/fin" element={<FinDiagnosis />} />
        <Route path="/scene/credit" element={<CreditReport />} />
        <Route path="/scene/group" element={<GroupWarRoom />} />
        <Route path="/scene/sparring" element={<Sparring />} />
        <Route path="/scene/profile" element={<Profile />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/pathways" element={<Pathways />} />
      </Routes>
    </Shell>
  );
}
