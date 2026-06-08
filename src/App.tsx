import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import TrainingPlan from './pages/TrainingPlan'
import AnalysisCenter from './pages/AnalysisCenter'
import Profile from './pages/Profile'
import TrainingDetail from './pages/TrainingDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/training" element={<TrainingPlan />} />
        <Route path="/analysis" element={<AnalysisCenter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/detail" element={<TrainingDetail />} />
      </Route>
    </Routes>
  )
}
