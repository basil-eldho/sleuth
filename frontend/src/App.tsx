import { Routes, Route } from 'react-router-dom'
import ContainerList from './pages/ContainerList'
import ContainerDetail from './pages/ContainerDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ContainerList />} />
      <Route path="/containers/:id" element={<ContainerDetail />} />
    </Routes>
  )
}
