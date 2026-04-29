/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Jobs from './pages/Jobs';
import Quotations from './pages/Quotations';
import PriceList from './pages/PriceList';
import Approvals from './pages/Approvals';
import Settings from './pages/Settings';
import SettingsAI from './pages/SettingsAI';
import Targets from './pages/Targets';
import Login from './pages/Login';
import CheckIns from './pages/CheckIns';
import Chat from './pages/Chat';

import Reports from './pages/Reports';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LanguageProvider>
          <DataProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="customers" element={<Customers />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="quotations" element={<Quotations />} />
                <Route path="price-list" element={<PriceList />} />
                <Route path="approvals" element={<Approvals />} />
                <Route path="settings" element={<Settings />} />
                <Route path="settings/ai" element={<SettingsAI />} />
                <Route path="targets" element={<Targets />} />
                <Route path="check-ins" element={<CheckIns />} />
                <Route path="chat" element={<Chat />} />
                <Route path="reports" element={<Reports />} />
              </Route>
            </Routes>
          </BrowserRouter>
          </DataProvider>
        </LanguageProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
