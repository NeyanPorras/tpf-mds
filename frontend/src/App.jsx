import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout/Layout.jsx'
import ProtegerRuta from './layout/ProtegerRuta.jsx'
import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import Productos from './pages/Productos.jsx'
import Clientes from './pages/Clientes.jsx'
import Pedidos from './pages/Pedidos.jsx'
import Reportes from './pages/Reportes.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Demo from './pages/Demo.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          {/* Sin sesión: cualquier ruta interna manda al login. */}
          <Route element={<ProtegerRuta />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/pedidos" element={<Pedidos />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/demo" element={<Demo />} />
          </Route>
          {/* Solo ADMIN y VENDEDOR (DEPOSITO no administra clientes). */}
          <Route element={<ProtegerRuta to="/clientes" />}>
            <Route path="/clientes" element={<Clientes />} />
          </Route>
          {/* Solo ADMIN: si otro rol la escribe a mano, vuelve al inicio. */}
          <Route element={<ProtegerRuta to="/usuarios" />}>
            <Route path="/usuarios" element={<Usuarios />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
