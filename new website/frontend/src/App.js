import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SavedJobsPage from './pages/SavedJobsPage';
import ApplicationTrackerPage from './pages/ApplicationTrackerPage';
import ResumePage from './pages/ResumePage';
import TeamPage from './pages/TeamPage';
import EmployerLoginPage from './pages/EmployerLoginPage';
import EmployerRegisterPage from './pages/EmployerRegisterPage';
import EmployerHomePage from './pages/EmployerHomePage';
import EmployerPortalPage from './pages/EmployerPortalPage';
import JobDetailsPage from './pages/JobDetailsPage';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const EmployerRoute = ({ children }) => {
  const { isAuthenticated, isEmployer } = useAuth();
  if (!isAuthenticated) return <Navigate to="/employer/login" replace />;
  return isEmployer ? children : <Navigate to="/jobs" replace />;
};

const App = () => (
  <div className="app-shell">
    <Navbar />
    <Routes>
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/team" element={<TeamPage />} />
      <Route path="/jobs" element={<JobsPage />} />
      <Route path="/jobs/:jobId" element={<JobDetailsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/employer" element={<EmployerPortalPage />} />
      <Route path="/employer/login" element={<EmployerLoginPage />} />
      <Route path="/employer/register" element={<EmployerRegisterPage />} />
      <Route path="/employer/workspace" element={<EmployerRoute><EmployerHomePage /></EmployerRoute>} />
      <Route path="/employer/home" element={<Navigate to="/employer/workspace" replace />} />
      <Route path="/saved" element={<PrivateRoute><SavedJobsPage /></PrivateRoute>} />
      <Route path="/applications" element={<PrivateRoute><ApplicationTrackerPage /></PrivateRoute>} />
      <Route path="/resume" element={<PrivateRoute><ResumePage /></PrivateRoute>} />
    </Routes>
    <Footer />
  </div>
);

export default App;
