import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AboutPage from './pages/AboutPage';
import DashboardPage from './pages/DashboardPage';
import EmployerHomePage from './pages/EmployerHomePage';
import EmployerLoginPage from './pages/EmployerLoginPage';
import EmployerRegisterPage from './pages/EmployerRegisterPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function AuthShell({ children }) {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="/">Job <span>Aggregator</span></a>
          <nav className="nav"><a href="/about">Meet the Team</a></nav>
        </div>
      </header>
      {children}
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/login" element={<AuthShell><LoginPage /></AuthShell>} />
      <Route path="/register" element={<AuthShell><RegisterPage /></AuthShell>} />
      <Route path="/employers" element={<EmployerHomePage />} />
      <Route path="/employers/login" element={<EmployerLoginPage />} />
      <Route path="/employers/register" element={<EmployerRegisterPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
