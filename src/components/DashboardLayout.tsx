import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, LayoutDashboard, Calendar, Bell, User, Menu, X, Sun, Moon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export function DashboardLayout() {
  const { currentUser, loading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <Logo className="w-16 h-16 text-primary drop-shadow-[0_0_15px_rgba(124,58,237,0.35)] mb-4" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" />;
  }

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendário', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Loja', path: '/dashboard/settings', icon: Settings },
    { name: 'Conta', path: '/dashboard/account', icon: User },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row selection:bg-primary/20">
      {/* Sidebar - Desktop */}
      <aside className="w-full md:w-64 bg-sidebar/95 backdrop-blur-xl border-r border-sidebar-border flex-col hidden md:flex h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-10">
            <Logo className="w-8 h-8 text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.25)]" />
            <span className="font-semibold text-xl tracking-tight text-foreground">Syncou</span>
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start font-medium h-10 rounded-lg transition-all relative overflow-hidden ${location.pathname === item.path ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'}`}
                >
                  {location.pathname === item.path && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary rounded-r-full" />}
                  <item.icon className={`mr-3 w-4 h-4 ${location.pathname === item.path ? 'text-primary' : ''}`} strokeWidth={2} />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-6">
            <Avatar className="w-10 h-10 ring-1 ring-border shadow-sm">
              <AvatarImage src={currentUser?.avatarUrl || ''} />
              <AvatarFallback className="bg-accent text-accent-foreground font-medium">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="font-medium text-sm text-foreground truncate">{currentUser?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/60 font-medium h-10 mb-1.5" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="mr-3 w-4 h-4" strokeWidth={2} /> : <Moon className="mr-3 w-4 h-4" strokeWidth={2} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 font-medium h-10" onClick={logout}>
            <LogOut className="mr-3 w-4 h-4" strokeWidth={2} />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between bg-background/90 backdrop-blur-xl border-b border-border p-4 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(124,58,237,0.2)]" />
            <span className="font-bold text-xl tracking-tight text-foreground">Syncou</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2.5 rounded-xl transition-all duration-300 relative z-50 flex items-center justify-center ${mobileMenuOpen ? 'bg-accent text-primary' : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 shadow-sm'}`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-30 bg-background/98 backdrop-blur-2xl pt-24 px-6 flex flex-col h-screen overflow-y-auto"
            >
              <div className="flex-1 flex flex-col pb-8">
                <nav className="space-y-3 mt-4">
                  {navItems.map((item, i) => (
                    <motion.div
                      key={item.path}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
                    >
                      <Link to={item.path} className="block">
                        <Button
                          variant="ghost"
                          className={`w-full justify-start font-medium h-14 text-lg rounded-xl transition-all relative overflow-hidden ${location.pathname === item.path ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'}`}
                        >
                          {location.pathname === item.path && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-primary rounded-r-full" />}
                          <item.icon className={`mr-4 w-6 h-6 ${location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`} strokeWidth={2} />
                          {item.name}
                        </Button>
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-auto pt-8 border-t border-border"
                >
                  <div className="flex items-center gap-4 mb-6 bg-card p-4 rounded-2xl border border-border shadow-sm">
                    <Avatar className="w-12 h-12 ring-2 ring-border ring-offset-2 ring-offset-card">
                      <AvatarImage src={currentUser?.avatarUrl || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-medium">{currentUser?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden flex-1">
                      <p className="font-semibold text-foreground truncate text-base">{currentUser?.displayName}</p>
                      <p className="text-sm text-muted-foreground truncate">{currentUser?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border bg-card text-foreground hover:text-foreground hover:bg-accent/60 font-medium h-14 rounded-xl transition-all mb-3"
                    onClick={toggleTheme}
                  >
                    {theme === 'dark' ? <Sun className="mr-3 w-5 h-5" strokeWidth={2} /> : <Moon className="mr-3 w-5 h-5" strokeWidth={2} />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-border bg-card text-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 font-medium h-14 rounded-xl transition-all"
                    onClick={logout}
                  >
                    <LogOut className="mr-3 w-5 h-5 text-red-500/80" strokeWidth={2} />
                    Sair da conta
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="flex-1 p-6 md:p-10 flex flex-col">
          <div className="max-w-5xl mx-auto w-full flex-1">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
