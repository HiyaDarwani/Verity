/**
 * App.tsx
 * Main application router and context provider for Verity.
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ProtectedRoute } from './router/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

// Student Pages
import { StudentDashboard } from './pages/student/StudentDashboard';
import { StudentResults } from './pages/student/StudentResults';
import { ExamInstructions } from './pages/student/ExamInstructions';
import { ExamTaking } from './pages/student/ExamTaking';
import { ExamSubmitted } from './pages/student/ExamSubmitted';

// Examiner Pages
import { ExaminerDashboard } from './pages/examiner/ExaminerDashboard';
import { ExamList } from './pages/examiner/ExamList';
import { ExamDetail } from './pages/examiner/ExamDetail';
import { ExamResults } from './pages/examiner/ExamResults';
import { ProctoringReview } from './pages/examiner/ProctoringReview';

// Administrator Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { AttemptMonitoring } from './pages/AttemptMonitoring';
import { ActivityLogs } from './pages/ActivityLogs';

function FallbackRedirect() {
  const { authUser } = useApp();
  if (!authUser) return <Navigate to="/" replace />;
  switch (authUser.role) {
    case 'Student':
      return <Navigate to="/student/dashboard" replace />;
    case 'Examiner':
      return <Navigate to="/examiner/dashboard" replace />;
    case 'Administrator':
      return <Navigate to="/admin/dashboard" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRole="Student" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/results" element={<StudentResults />} />
            <Route path="/student/exam/:id/instructions" element={<ExamInstructions />} />
            <Route path="/student/exam/:id/take" element={<ExamTaking />} />
            <Route path="/student/exam/:id/done" element={<ExamSubmitted />} />
          </Route>

          {/* Examiner Routes */}
          <Route element={<ProtectedRoute allowedRole="Examiner" />}>
            <Route path="/examiner/dashboard" element={<ExaminerDashboard />} />
            <Route path="/examiner/exams" element={<ExamList />} />
            <Route path="/examiner/exams/:id" element={<ExamDetail />} />
            <Route path="/examiner/results" element={<ExamResults />} />
            <Route path="/examiner/proctoring" element={<ProctoringReview />} />
            <Route path="/examiner/attempts" element={<AttemptMonitoring />} />
            <Route path="/examiner/activities" element={<ActivityLogs />} />
          </Route>

          {/* Administrator Routes */}
          <Route element={<ProtectedRoute allowedRole="Administrator" />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/exams" element={<ExamList />} />
            <Route path="/admin/exams/:id" element={<ExamDetail />} />
            <Route path="/admin/attempts" element={<AttemptMonitoring />} />
            <Route path="/admin/results" element={<ExamResults />} />
            <Route path="/admin/proctoring" element={<ProctoringReview />} />
            <Route path="/admin/activities" element={<ActivityLogs />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<FallbackRedirect />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
