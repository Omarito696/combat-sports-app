import { isSimulation } from '@/api/supabaseClient';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Events from '@/pages/Events';
import EventDetail from '@/pages/EventDetail';
import Fights from '@/pages/Fights';
import Fighters from '@/pages/Fighters';
import Fantasy from '@/pages/Fantasy';
import FantasyLineupBuilder from '@/pages/FantasyLineupBuilder';
import FantasyLeagues from '@/pages/FantasyLeagues';
import Predictions from '@/pages/Predictions';
import Divisions from '@/pages/Divisions';
import Organizations from '@/pages/Organizations';
import News from '@/pages/News';
import Profile from '@/pages/Profile';
import FightDetail from '@/pages/FightDetail';
import Onboarding from '@/pages/Onboarding';
import FighterProfile from '@/pages/FighterProfile';
import DataAdmin from '@/pages/DataAdmin';
import IntegrationTest from '@/pages/IntegrationTest';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/fights" element={<Fights />} />
          <Route path="/fighters" element={<Fighters />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/fantasy" element={<Fantasy />} />
          <Route path="/fantasy/lineup" element={<FantasyLineupBuilder />} />
          <Route path="/fantasy/leagues" element={<FantasyLeagues />} />
          <Route path="/fantasy/leagues/create" element={<FantasyLeagues />} />
          <Route path="/fantasy/leagues/join" element={<FantasyLeagues />} />
          <Route path="/fantasy/predictions" element={<Predictions />} />
          <Route path="/fantasy/divisions" element={<Divisions />} />
          <Route path="/news" element={<News />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/fights/:id" element={<FightDetail />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/fighters/:name" element={<FighterProfile />} />
          <Route path="/admin/data" element={<DataAdmin />} />
          <Route path="/admin/integration-test" element={<IntegrationTest />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          {isSimulation && <div role="status" className="sticky top-0 z-[100] bg-amber-300 text-black text-center text-sm font-bold p-2">SIMULATION — local sandbox only · No real sports data or database writes</div>}
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App