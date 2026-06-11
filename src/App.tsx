import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import StockIn from './pages/StockIn'
import Inventory from './pages/Inventory'
import StockOut from './pages/StockOut'
import Transfer from './pages/Transfer'
import Warning from './pages/Warning'
import Transaction from './pages/Transaction'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/stock-in" replace />} />
        <Route path="stock-in" element={<StockIn />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="stock-out" element={<StockOut />} />
        <Route path="transfer" element={<Transfer />} />
        <Route path="warning" element={<Warning />} />
        <Route path="transaction" element={<Transaction />} />
      </Route>
    </Routes>
  )
}

export default App
