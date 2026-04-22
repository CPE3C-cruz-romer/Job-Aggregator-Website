import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import OnboardingPage from './pages/OnboardingPage';
import UserProfilePage from './pages/UserProfilePage';
import EmployerProfilePage from './pages/EmployerProfilePage';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isEmployer, onboardingCompleted } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isEmployer && !onboardingCompleted) return <Navigate to="/onboarding" replace />;
  return children;
};

const EmployerRoute = ({ children }) => {
  const { isAuthenticated, isEmployer } = useAuth();
  if (!isAuthenticated) return <Navigate to="/employer/login" replace />;
  return isEmployer ? children : <Navigate to="/jobs" replace />;
};

const OnboardingRoute = ({ children }) => {
  const { isAuthenticated, isEmployer, onboardingCompleted } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isEmployer || onboardingCompleted) return <Navigate to="/jobs" replace />;
  return children;
};

const App = () => {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Navbar />
      <main key={location.pathname} className="route-shell route-enter">
        <Routes location={location}>
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
          <Route path="/onboarding" element={<OnboardingRoute><OnboardingPage /></OnboardingRoute>} />
          <Route path="/profile" element={<PrivateRoute><UserProfilePage /></PrivateRoute>} />
          <Route path="/employer/profile" element={<EmployerRoute><EmployerProfilePage /></EmployerRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
