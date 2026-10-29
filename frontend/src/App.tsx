import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout.tsx'
import Login from './pages/Login.tsx'
import Inicio from './pages/Inicio.tsx'
import Productos from './pages/Productos.tsx'
import Clientes from './pages/Clientes.tsx'
import Pedidos from './pages/Pedidos.tsx'
import Reportes from './pages/Reportes.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/pedidos" element={<Pedidos />} />
          <Route path="/reportes" element={<Reportes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
