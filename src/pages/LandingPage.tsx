import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Share2, CalendarDays, Settings, Mail, Lock, Loader2, XCircle, Check, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from '../components/Logo';
import { useNotification } from '../hooks/useNotification';
import { googleSignInBasic } from '../lib/firebase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();
  const { currentUser, login, register, loginWithGoogle } = useAuth();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isValidPassword = hasMinLength && hasUppercase && hasNumber && hasSpecialChar;

  const handleGoogleSignIn = async () => {
    if (authMode === 'register' && !hasAcceptedTerms) {
      notifyError('Você precisa aceitar os Termos de Serviço para criar uma conta.');
      return;
    }
    
    setIsGoogleSubmitting(true);
    try {
      const result = await googleSignInBasic();
      if (result) {
        const { user } = result;
        const success = await loginWithGoogle(
          user.email || '',
          user.displayName || ''
        );
        if (success) {
          notifySuccess('Login efetuado com sucesso!');
          setIsAuthModalOpen(false);
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        notifyError('O login com Google foi cancelado. Você pode usar seu e-mail e senha.');
      } else {
        notifyError('Erro ao fazer login com o Google. Use e-mail e senha, se preferir.');
      }
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  // Smart routing
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.slug) {
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    }
  }, [currentUser, navigate]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    
    if (!cleanEmail || !password) {
      notifyError('Preencha todos os campos.');
      return;
    }
    
    if (authMode === 'register' && !isValidPassword) {
      notifyError('Por favor, atenda a todos os critérios da senha.');
      return;
    }

    if (authMode === 'register' && !hasAcceptedTerms) {
      notifyError('Você precisa aceitar os Termos de Serviço para criar uma conta.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (authMode === 'login') {
        const success = await login(cleanEmail, password);
        if (success) {
          notifySuccess('Login efetuado com sucesso!');
          setIsAuthModalOpen(false);
        }
      } else {
        if (authStep === 'form') {
          const res = await fetch('/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
          });
          const data = await res.json();
          if (res.ok) {
            notifySuccess('Código enviado! Verifique seu e-mail (ou o console).');
            setAuthStep('otp');
          } else {
            notifyError(data.error || 'Erro ao enviar código.');
          }
        } else {
          if (!otpCode) {
            notifyError('Preencha o código.');
            return;
          }
          const success = await register(cleanEmail, password, otpCode);
          if (success) {
            notifySuccess('Conta criada com sucesso!');
            setIsAuthModalOpen(false);
          }
        }
      }
    } catch (error: any) {
      notifyError('Erro ao realizar autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAuthModal = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthStep('form');
    setEmail('');
    setPassword('');
    setOtpCode('');
    setHasAcceptedTerms(false);
    setIsAuthModalOpen(true);
  };


  return (
    <div className="min-h-screen bg-[#0B0914] text-[#E2D9F3] font-sans selection:bg-violet-500/30">
      <header className="fixed top-0 w-full bg-[#0B0914]/80 backdrop-blur-md border-b border-[#2D214F] z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium" onClick={() => openAuthModal('login')}>Log in</Button>
            <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[0_0_20px_rgba(139,92,246,0.2)] font-medium rounded-lg" onClick={() => openAuthModal('register')}>
              Criar minha conta
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-16 px-4 overflow-hidden relative">
        {/* Glow Background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/20 blur-[120px] rounded-full pointer-events-none" />

        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto text-center mb-24 relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-violet-500 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            </span>
            Acesso Antecipado
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-white leading-[1.1]">
            Seus agendamentos,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">organizados de verdade.</span>
          </h1>
          <p className="text-xl text-[#9B8FC0] mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
            Seja um dos primeiros a experimentar uma plataforma criada para simplificar sua rotina. 
            Crie sua página, libere seus horários e foque no que você faz de melhor.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button size="lg" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white w-full sm:w-auto text-lg h-14 px-8 rounded-lg shadow-[0_0_30px_rgba(139,92,246,0.25)] font-medium transition-all" onClick={() => openAuthModal('register')}>
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <div className="flex items-center justify-center gap-2 text-sm text-[#5B4F81] font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400/80" />
              <span>Não pedimos cartão de crédito</span>
            </div>
          </div>
          

        </motion.section>

        {/* Browser Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto relative z-10 mb-32"
        >
          <div className="rounded-xl overflow-hidden border border-[#2D214F] bg-[#130E20] shadow-2xl shadow-violet-900/20 ring-1 ring-white/10">
            {/* Header */}
            <div className="h-12 bg-[#1A1333] border-b border-[#2D214F] flex items-center px-4 gap-2">
              <div className="flex gap-1.5 mr-4">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-[#0B0914] border border-[#2D214F] rounded-md px-3 py-1 flex items-center gap-2 text-xs text-[#5B4F81] w-48 sm:w-64 max-w-full shadow-inner">
                  <Lock className="w-3 h-3 text-emerald-400/70" />
                  <span>syncou.app/seu-nome</span>
                </div>
              </div>
              <div className="w-10"></div>
            </div>
            
            {/* App Preview Content (Detailed UI Mockup) */}
            <div className="h-[350px] md:h-[450px] bg-[#0B0914] relative overflow-hidden flex">
              {/* Sidebar Mockup */}
              <div className="w-48 bg-[#100C18] border-r border-[#2D214F] p-5 hidden md:flex flex-col gap-3 relative z-10">
                <div className="h-5 w-24 bg-[#2D214F] rounded-md mb-6" />
                <div className="h-9 w-full bg-violet-500/15 text-violet-400 rounded-lg flex items-center px-3 gap-3 border border-violet-500/30">
                   <div className="w-4 h-4 bg-violet-400/50 rounded flex-shrink-0" />
                   <div className="h-2 w-16 bg-violet-400/50 rounded-sm" />
                </div>
                <div className="h-9 w-full bg-[#1A1333]/50 rounded-lg flex items-center px-3 gap-3 hover:bg-[#1A1333] transition-colors border border-transparent">
                   <div className="w-4 h-4 bg-[#5B4F81] rounded flex-shrink-0" />
                   <div className="h-2 w-14 bg-[#5B4F81] rounded-sm" />
                </div>
                <div className="h-9 w-full bg-[#1A1333]/50 rounded-lg flex items-center px-3 gap-3 hover:bg-[#1A1333] transition-colors border border-transparent">
                   <div className="w-4 h-4 bg-[#5B4F81] rounded flex-shrink-0" />
                   <div className="h-2 w-20 bg-[#5B4F81] rounded-sm" />
                </div>
              </div>
              
              {/* Main Content Mockup */}
              <div className="flex-1 p-6 relative z-10 flex flex-col">
                 <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2">
                       <div className="h-6 w-40 bg-[#E2D9F3] rounded-md" />
                       <div className="h-3 w-64 bg-[#5B4F81] rounded-sm" />
                    </div>
                    <div className="h-10 w-10 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-full shadow-lg ring-2 ring-white/10" />
                 </div>
                 
                 {/* Stats Cards */}
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { top: 'Faturamento', bottom: 'bg-emerald-400', w: 'w-24', icon: 'bg-emerald-400/20' },
                      { top: 'Agendamentos', bottom: 'bg-violet-400', w: 'w-16', icon: 'bg-violet-400/20' },
                      { top: 'Clientes', bottom: 'bg-amber-400', w: 'w-20', icon: 'bg-amber-400/20', hidden: 'hidden md:flex' }
                    ].map((stat, i) => (
                      <div key={i} className={`h-28 bg-[#130E20] border border-[#2D214F] rounded-xl p-5 flex flex-col justify-between ${stat.hidden || 'flex'}`}>
                        <div className="flex justify-between items-start">
                          <div className="h-3 w-20 bg-[#5B4F81] rounded-sm" />
                          <div className={`w-6 h-6 rounded-md ${stat.icon}`} />
                        </div>
                        <div className={`h-7 ${stat.bottom} rounded-md ${stat.w}`} />
                      </div>
                    ))}
                 </div>
                 
                 {/* Table / List Mockup */}
                 <div className="bg-[#130E20] border border-[#2D214F] rounded-xl p-5 flex-1 flex flex-col">
                    <div className="h-4 w-32 bg-[#E2D9F3] rounded-sm mb-6" />
                    <div className="space-y-3 flex-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 w-full bg-[#1A1333]/50 rounded-lg border border-[#2D214F]/50 flex items-center px-4 justify-between group hover:bg-[#1A1333] transition-colors">
                          <div className="flex items-center gap-4">
                             <div className={`w-2.5 h-2.5 rounded-full ${i === 1 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : i === 2 ? 'bg-amber-400' : 'bg-violet-400'}`} />
                             <div>
                               <div className="h-3 w-24 bg-[#E2D9F3] rounded-sm mb-2" />
                               <div className="h-2 w-16 bg-[#5B4F81] rounded-sm" />
                             </div>
                          </div>
                          <div className="flex gap-2">
                            <div className="h-6 w-16 bg-[#2D214F] rounded-md hidden sm:block" />
                            <div className="h-6 w-20 bg-[#2D214F] rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
              
              {/* Decorative elements / Glow behind UI */}
              <div className="absolute top-10 -right-20 w-64 h-64 bg-fuchsia-600/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="absolute bottom-10 -left-20 w-80 h-80 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />
            </div>
          </div>
        </motion.div>

        <section className="max-w-5xl mx-auto py-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl font-semibold text-center mb-16 text-white tracking-tight"
          >
            Tudo que você precisa em um só lugar
          </motion.h2>
          <div className="grid md:grid-cols-12 gap-6">
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-8"
            >
              <Card className="border border-[#2D214F] bg-gradient-to-br from-[#130E20] to-[#0A0713] shadow-sm h-full group overflow-hidden relative">
                <CardContent className="p-8 h-full flex flex-col justify-center">
                  <div className="w-12 h-12 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center mb-6 text-violet-400">
                    <Share2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">Sua página exclusiva</h3>
                  <p className="text-[#9B8FC0] leading-relaxed max-w-lg mb-8">
                    Crie uma página de agendamentos profissional que reflete a sua marca. Compartilhe o link no seu Instagram, WhatsApp ou onde preferir. Otimizado para qualquer dispositivo.
                  </p>
                  
                  {/* Visual mockup inside card */}
                  <div className="mt-auto absolute -bottom-10 -right-10 w-[70%] sm:w-[50%] h-[200px] bg-[#1A1333] border border-[#2D214F] rounded-tl-xl p-4 opacity-50 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:-translate-y-2 group-hover:-translate-x-2">
                     <div className="h-full border border-violet-500/20 bg-[#130E20] rounded-lg p-3 space-y-3">
                       <div className="w-full h-8 bg-[#2D214F]/40 rounded-md" />
                       <div className="w-3/4 h-4 bg-[#2D214F]/40 rounded-md" />
                       <div className="w-full h-12 bg-violet-500/20 border border-violet-500/30 rounded-md mt-4" />
                     </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-4"
            >
              <Card className="border border-[#2D214F] bg-gradient-to-bl from-[#130E20] to-[#0A0713] shadow-sm h-full overflow-hidden relative">
                <CardContent className="p-8 h-full flex flex-col items-start justify-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mb-6 text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">Sincronia Total</h3>
                  <p className="text-[#9B8FC0] leading-relaxed">
                    Sincronize com o Google Agenda e evite choques de horários automaticamente.
                  </p>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 opacity-10">
                    <CalendarDays className="w-48 h-48" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-5"
            >
              <Card className="border border-[#2D214F] bg-gradient-to-tr from-[#130E20] to-[#0A0713] shadow-sm h-full overflow-hidden relative group">
                <CardContent className="p-8 h-full flex flex-col justify-center">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mb-6 text-amber-400">
                    <Star className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">Menos Faltas</h3>
                  <p className="text-[#9B8FC0] leading-relaxed relative z-10">
                    Seus clientes são lembrados do agendamento, diminuindo o número de ausências (no-show) e garantindo seu faturamento.
                  </p>
                  
                  {/* Decorative background element */}
                  <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-amber-500/5 blur-2xl rounded-full group-hover:bg-amber-500/10 transition-colors" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-7"
            >
              <Card className="border border-[#2D214F] bg-gradient-to-tl from-[#130E20] to-[#0A0713] shadow-sm h-full overflow-hidden relative group">
                <CardContent className="p-8 h-full flex flex-col justify-center">
                  <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-400">
                    <Settings className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">Gestão Inteligente</h3>
                  <p className="text-[#9B8FC0] leading-relaxed max-w-md relative z-10">
                    Tenha o controle total do seu negócio. Acompanhe métricas, gerencie seu portfólio de serviços, exporte relatórios (CSV) e gerencie sua disponibilidade em uma interface limpa e intuitiva.
                  </p>
                  
                  <div className="mt-8 flex gap-3 h-12">
                     <div className="h-full w-32 bg-[#1A1333] border border-[#2D214F] rounded-lg animate-pulse" />
                     <div className="h-full w-24 bg-[#1A1333] border border-[#2D214F] rounded-lg animate-pulse delay-75" />
                     <div className="h-full w-20 bg-[#1A1333] border border-[#2D214F] rounded-lg animate-pulse delay-150" />
                  </div>
                  
                  <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-colors" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-12 mt-8"
            >
              <Card className="border border-[#2D214F] bg-[#130E20] shadow-sm">
                <CardContent className="p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                  <div className="max-w-xl">
                    <h3 className="text-2xl font-semibold mb-3 text-white tracking-tight">Pronto para elevar o nível?</h3>
                    <p className="text-[#9B8FC0] leading-relaxed">
                      Junte-se a profissionais parceiros e transforme a maneira como você se conecta com seus clientes. Design brilhante, conversão impecável.
                    </p>
                  </div>
                  <Button size="lg" className="bg-white text-black hover:bg-gray-200 w-full sm:w-auto h-12 px-8 font-semibold rounded-lg shrink-0" onClick={() => openAuthModal('register')}>
                    Criar minha conta grátis
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2D214F] py-12 bg-[#08060F] mt-20">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center text-[#9B8FC0] text-sm">
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-white transition-colors">Termos de Serviço e Privacidade</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Syncou. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Auth Modal with Email/Password */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3] p-8 shadow-2xl rounded-2xl">
          <>
            <DialogHeader className="space-y-2">
              <div className="mx-auto flex items-center justify-center mb-4">
                <Logo className="w-12 h-12 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
              </div>
              <DialogTitle className="text-2xl font-semibold text-center text-white tracking-tight">
                {authMode === 'login' 
                  ? 'Entrar no Syncou' 
                  : 'Crie sua conta' 
                }
              </DialogTitle>
              <DialogDescription className="text-center text-[#9B8FC0] text-sm">
                {authMode === 'login' 
                  ? 'Entre para gerenciar seus agendamentos' 
                  : 'Comece a receber agendamentos de forma elegante' 
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 p-1 bg-[#0A0713] rounded-lg my-6 border border-[#2D214F]/50">
              <button
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'login'
                    ? 'bg-[#2D214F] text-white shadow-sm'
                    : 'text-[#9B8FC0] hover:text-white'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'register'
                    ? 'bg-[#2D214F] text-white shadow-sm'
                    : 'text-[#9B8FC0] hover:text-white'
                }`}
              >
                Criar Conta
              </button>
            </div>

            <div className="space-y-5">
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                {authMode === 'register' && authStep === 'otp' ? (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4">
                    <Label htmlFor="auth-otp" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                      Código de Verificação
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                      <Input
                        id="auth-otp"
                        type="text"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Ex: 123456"
                        className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-[#9B8FC0] mt-2">Enviamos um código para {email}.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                        <Input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com"
                          className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-[#9B8FC0]">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7C6FA4]" />
                        <Input
                          id="auth-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authMode === 'register' ? "Mínimo 6 caracteres" : "Sua senha"}
                          className="bg-[#0A0713] border-[#2D214F] text-[#E2D9F3] placeholder:text-[#5B4F81] pl-10 focus-visible:ring-violet-500 h-11 rounded-lg shadow-sm"
                        />
                      </div>
                      
                      {authMode === 'register' && (
                        <div className="pt-2 space-y-1.5 flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-xs">
                            {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasMinLength ? "text-emerald-400" : "text-[#5B4F81]"}>Mínimo de 6 caracteres</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasUppercase ? "text-emerald-400" : "text-[#5B4F81]"}>1 letra maiúscula</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasNumber ? "text-emerald-400" : "text-[#5B4F81]"}>1 número</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasSpecialChar ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#5B4F81] shrink-0" />}
                            <span className={hasSpecialChar ? "text-emerald-400" : "text-[#5B4F81]"}>1 caractere especial</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {authMode === 'register' && authStep === 'form' && (
                  <div className="flex items-start space-x-3 pt-2">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={hasAcceptedTerms}
                      onChange={(e) => setHasAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-[#2D214F] bg-[#1A1333] text-[#8B5CF6] focus:ring-[#8B5CF6] focus:ring-offset-[#130E20] focus:ring-offset-2 shrink-0 accent-[#8B5CF6] cursor-pointer"
                    />
                    <label
                      htmlFor="terms"
                      className="text-xs font-medium leading-relaxed text-[#9B8FC0] cursor-pointer"
                    >
                      Eu li e concordo com os{" "}
                      <Link to="/termos" target="_blank" className="font-semibold text-violet-400 hover:text-white transition-colors">
                        Termos de Serviço e Política de Privacidade
                      </Link>.
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || (authMode === 'register' && authStep === 'form' && (!isValidPassword || !hasAcceptedTerms))}
                  className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium h-11 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.25)] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando...
                    </>
                  ) : authMode === 'login' ? (
                    'Entrar'
                  ) : authStep === 'otp' ? (
                    'Confirmar e Criar Conta'
                  ) : (
                    'Continuar'
                  )}
                </Button>
              </form>

              {authStep === 'form' && (
                <>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#2D214F]"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#130E20] px-3 text-[#5B4F81] uppercase tracking-widest font-medium">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isGoogleSubmitting || (authMode === 'register' && !hasAcceptedTerms)}
                    onClick={handleGoogleSignIn}
                    className="w-full border-[#2D214F] bg-[#1A1333] hover:bg-[#2D214F] text-[#E2D9F3] font-medium h-11 rounded-lg shadow-sm"
                  >
                    {isGoogleSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-zinc-500" />
                    ) : (
                      <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    )}
                    <span>Continuar com Google</span>
                  </Button>
                </>
              )}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-sm text-[#9B8FC0] hover:text-white hover:underline decoration-[#5B4F81] underline-offset-4 transition-all"
                >
                  {authMode === 'login' 
                    ? 'Não tem uma conta? Comece aqui'
                    : 'Já possui cadastro? Acesse sua conta'
                  }
                </button>
              </div>
            </div>
          </>
        </DialogContent>
      </Dialog>
    </div>
  );
}
