import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Swords, Menu, X, Trophy, Newspaper, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/fights', label: 'Fights', icon: Swords },
  { path: '/fighters', label: 'Fighters', icon: Users },
  { path: '/fantasy', label: 'Fantasy', icon: Trophy },
  { path: '/news', label: 'News', icon: Newspaper },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Onboarding: redirect new users who haven't set up a profile
  useEffect(() => {
    if (location.pathname === '/onboarding') return;
    base44.auth.me().then(async user => {
      if (!user) return;
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (!profiles.length) navigate('/onboarding');
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Swords className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-wide uppercase text-foreground">
              FightTracker
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  location.pathname === path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  location.pathname === path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom Nav Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-xl z-50">
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all",
                location.pathname === path
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}