import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Provider as ReduxProvider } from "react-redux";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { store } from "@/store/store";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import UserHome from "./pages/user/UserHome";
import Jobs from "./pages/user/Jobs";
import ResumeUpload from "./pages/user/ResumeUpload";
import TrackOpenings from "./pages/user/TrackOpenings";
import UserProfile from "./pages/user/UserProfile";
import AIInterview from "./pages/user/AIInterview";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import RecruiterDetails from "./pages/admin/OrganizationDetails";
import OrganizationHome from "./pages/organization/OrganizationHome";
import OrganizationDashboard from "./pages/organization/OrganizationDashboard";
import CampaignFlow from "./pages/organization/CampaignFlow";
import CandidateReview from "./pages/organization/CandidateReview";
import RecDashboard from "./pages/organization/RecDashboard";
import RecCalendar from "./pages/organization/RecCalendar";
import RecSchedule from "./pages/organization/RecSchedule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/** Redirect to the appropriate dashboard based on role */
function rolePath(role: string | undefined): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "organization":
      return "/organization";
    default:
      return "/user";
  }
}

const ProtectedRoutes = () => {
  const { isAuthenticated, isHydrating } = useAuth();
  if (isHydrating) return null; // splash / skeleton could go here
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout />;
};

const AppRoutes = () => {
  const { isAuthenticated, user, isHydrating } = useAuth();
  const dashboard = rolePath(user?.role);

  if (isHydrating) return null; // wait for session hydration before redirecting

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={dashboard} /> : <Landing />}
      />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={dashboard} /> : <Login />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to={dashboard} /> : <Signup />}
      />

      {/* User Routes */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/user" element={<UserHome />} />
        <Route path="/user/jobs" element={<Jobs />} />
        <Route path="/user/resume" element={<ResumeUpload />} />
        <Route path="/user/track" element={<TrackOpenings />} />
        <Route path="/user/profile" element={<UserProfile />} />
      </Route>

      {/* Interview – full screen, no layout */}
      <Route path="/user/interview/:id" element={<AIInterview />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/organizations" element={<RecruiterDetails />} />
        <Route path="/admin/profile" element={<UserProfile />} />
      </Route>

      {/* Organization Routes */}
      <Route element={<ProtectedRoutes />}>
        <Route path="/organization" element={<OrganizationHome />} />
        <Route path="/organization/dashboard" element={<OrganizationDashboard />} />
        <Route path="/organization/campaign/:id" element={<CampaignFlow />} />
        <Route path="/organization/candidate/:id" element={<CandidateReview />} />
        <Route path="/organization/rec" element={<RecDashboard />} />
        <Route path="/organization/rec/calendar" element={<RecCalendar />} />
        <Route path="/organization/rec/schedule" element={<RecSchedule />} />
        <Route path="/organization/profile" element={<UserProfile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ReduxProvider store={store}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ReduxProvider>
);

export default App;
