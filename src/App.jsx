import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import ToastContainer from './components/common/ToastContainer';
import NasCloudLogo from './components/common/NasCloudLogo';
import ScrollbarTracker from './components/common/ScrollbarTracker';
import MeshBackground from './components/common/MeshBackground';
import DualLogin from './pages/DualLogin/DualLogin';
import Home from './pages/Home/Home';
import Dashboard from './pages/Dashboard/Dashboard';
import ForgotPassword from './pages/ForgotPassword/ForgotPassword';
import ForgotCode from './pages/ForgotCode/ForgotCode';
import ClientRegister from './pages/ClientRegister/ClientRegister';
import ShareAccess from './pages/ShareAccess/ShareAccess';
import FileBrowser from './pages/FileBrowser/FileBrowser';
import Trash from './pages/Trash/Trash';
import Settings from './pages/Settings/Settings';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MeshBackground />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<DualLogin />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/forgot-code" element={<ForgotCode />} />
            <Route path="/client-register" element={<ClientRegister />} />
            <Route path="/share/:userid/:filesharing/:time/:token" element={<ShareAccess />} />
            
            {/* Protected System Wrapper */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<FileBrowser />} />
              <Route path="/folder/:folderId" element={<FileBrowser />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <ToastContainer />
        <ScrollbarTracker />
      </ToastProvider>
    </AuthProvider>
  );
}
