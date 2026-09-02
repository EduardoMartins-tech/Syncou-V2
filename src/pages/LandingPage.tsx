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
    <div className="min-h-screen bg-[#0B0914] text-[#E2D9F3] font-sans selection:bg-[#F5A623]/30">
      <header className="fixed top-0 w-full bg-[#0B0914]/80 backdrop-blur-md border-b border-[#2D214F] z-50 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8 text-violet-400 drop-shadow-[0_0_12px_rgba(139,92,246,0.3)]" />
            <span className="font-semibold text-xl tracking-tight text-white">Syncou</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50 font-medium" onClick={() => openAuthModal('login')}>Log in</Button>
            <Button className="bg-[#F5A623] hover:bg-[#E09612] text-[#0A0713] shadow-[0_0_20px_rgba(245,166,35,0.2)] font-semibold rounded-lg" onClick={() => openAuthModal('register')}>
              Criar minha conta
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-16 px-4 overflow-hidden relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-[#F5A623]/5 blur-[100px] rounded-full pointer-events-none" />

        {/* HERO SECTION */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-5xl mx-auto mb-24 relative z-10 grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Text Left */}
          <div className="text-left text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8">
              <span className="flex h-2 w-2 rounded-full bg-violet-500 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              </span>
              Acesso Antecipado
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-8 text-white leading-[1.1] font-outfit">
              Clientes desistem enquanto você demora a responder.
            </h1>
            <p className="text-xl text-[#9B8FC0] mb-10 max-w-xl mx-auto lg:mx-0 font-normal leading-relaxed">
              O fim da troca interminável de mensagens. Você envia um link, seu cliente escolhe o horário, e a sua agenda trabalha sozinha enquanto você atende quem já está no consultório.
            </p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-6">
              <Button size="lg" className="bg-[#F5A623] hover:bg-[#E09612] text-[#0A0713] w-full sm:w-auto text-lg h-14 px-8 rounded-lg shadow-[0_0_30px_rgba(245,166,35,0.2)] font-semibold transition-all" onClick={() => openAuthModal('register')}>
                Criar meu link grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-[#5B4F81] font-medium h-14">
                <CheckCircle2 className="w-4 h-4 text-[#F5A623]/80" />
                <span>Configuração em 2 min</span>
              </div>
            </div>
          </div>
          
          {/* Visual Right - Orbit Concept */}
          <div className="relative h-[400px] w-full flex items-center justify-center hidden lg:flex">
             <div className="absolute w-[350px] h-[350px] border border-[#2D214F] rounded-full animate-[spin_60s_linear_infinite] opacity-50" />
             <div className="absolute w-[250px] h-[250px] border border-violet-500/30 rounded-full animate-[spin_40s_linear_infinite_reverse] opacity-70" />
             
             {/* Center Logo */}
             <div className="relative z-10 w-20 h-20 bg-[#130E20] border border-[#2D214F] rounded-2xl flex items-center justify-center shadow-2xl shadow-violet-900/20">
               <Logo className="w-10 h-10 text-violet-400" />
             </div>
             
             {/* Orbiting Elements */}
             <div className="absolute w-[350px] h-[350px] animate-[spin_60s_linear_infinite]">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                 <div className="animate-[spin_60s_linear_infinite_reverse] bg-[#0B0914] border border-[#2D214F] rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-lg text-xs text-[#E2D9F3] whitespace-nowrap">
                    <div className="w-2 h-2 rounded-full bg-violet-400" />
                    syncou.app/p/voce
                 </div>
               </div>
             </div>
             
             <div className="absolute w-[250px] h-[250px] animate-[spin_40s_linear_infinite_reverse]">
               <div className="absolute bottom-4 -right-4">
                 <div className="animate-[spin_40s_linear_infinite] bg-[#130E20] border border-[#F5A623]/30 rounded-lg p-3 flex items-start gap-3 shadow-[0_0_15px_rgba(245,166,35,0.15)]">
                    <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white font-outfit">Novo Agendamento!</p>
                      <p className="text-xs text-[#9B8FC0]">Hoje, às 14:30</p>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        </motion.section>

        {/* BENTO GRID ASSIMÉTRICO */}
        <section className="max-w-5xl mx-auto mb-32 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[220px]">
            
            {/* Bloco 1 (2 cols, 1 row): Sincronia em Tempo Real */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-2 row-span-1 bg-gradient-to-br from-[#130E20] to-[#0A0713] border border-[#2D214F] rounded-2xl p-8 relative overflow-hidden group"
            >
              <div className="relative z-10 w-full h-full flex flex-col justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2 font-outfit">Sincronia em Tempo Real</h3>
                  <p className="text-[#9B8FC0] max-w-[280px] leading-relaxed">Integração bidirecional com sua agenda atual. Sem delay, sem conflitos.</p>
                </div>
                <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all duration-700" />
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-8 w-[250px] h-[150px] bg-[#0B0914] border border-[#2D214F] rounded-xl shadow-2xl p-4 hidden sm:flex flex-col gap-3 rotate-[-5deg] group-hover:rotate-0 transition-transform duration-500">
                <div className="h-4 w-1/3 bg-[#2D214F] rounded" />
                <div className="flex gap-2 h-10 w-full bg-[#1A1333] rounded-md p-2 border border-violet-500/20">
                  <div className="h-full w-full bg-violet-400/20 rounded" />
                  <div className="h-full w-full bg-violet-400/20 rounded" />
                  <div className="h-full w-full bg-violet-400/50 rounded border border-violet-400" />
                </div>
              </div>
            </motion.div>

            {/* Bloco 2 (1 col, 2 rows): Zero Conflitos */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-1 row-span-2 bg-[#130E20] border border-[#2D214F] rounded-2xl p-8 relative overflow-hidden flex flex-col items-center text-center group"
            >
              <div className="flex-1 flex flex-col items-center justify-center w-full mt-8">
                <div className="relative w-full h-32 flex items-center justify-center">
                  <div className="absolute inset-0 border border-red-500/20 bg-red-500/5 rounded-xl flex items-center justify-center translate-y-4 group-hover:opacity-0 transition-opacity duration-300">
                    <span className="text-red-400 font-medium line-through">14:00 Ocupado</span>
                  </div>
                  <div className="absolute inset-0 border border-emerald-500/20 bg-emerald-500/10 rounded-xl flex items-center justify-center -translate-y-4 shadow-[0_0_20px_rgba(52,211,153,0.1)] opacity-50 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                    <span className="text-emerald-400 font-medium">14:00 Livre!</span>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-2xl font-bold text-white mb-2 font-outfit">Zero Conflitos</h3>
                <p className="text-[#9B8FC0] text-sm leading-relaxed">Bloqueia automaticamente horários que você já preencheu. O fim do choque de agendas.</p>
              </div>
            </motion.div>

            {/* Bloco 3 (1 col, 1 row): Seu Link Próprio */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-1 row-span-1 bg-[#130E20] border border-[#2D214F] rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center"
            >
              <h3 className="text-xl font-bold text-white mb-4 font-outfit">Seu Link Próprio</h3>
              <div className="bg-[#0B0914] border border-[#2D214F] rounded-lg p-3 font-mono text-sm text-[#E2D9F3] shadow-inner flex items-center break-all">
                <span className="text-[#5B4F81] select-none">syncou.app/p/</span>
                <span className="text-[#F5A623] font-bold">voce</span>
              </div>
            </motion.div>

            {/* Bloco 4 (1 col, 1 row): Notificações Silenciosas */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="md:col-span-1 row-span-1 bg-[#130E20] border border-[#2D214F] rounded-2xl p-8 relative overflow-hidden flex flex-col justify-center"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#F5A623]/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-[#F5A623]" />
                </div>
                <h3 className="text-xl font-bold text-white font-outfit">Notificações</h3>
              </div>
              <p className="text-[#9B8FC0] text-sm leading-relaxed">Avisos silenciosos e precisos para você e lembretes para seu cliente não faltar.</p>
            </motion.div>
          </div>
        </section>

        {/* NOVO CTA SECTION */}
        <section className="max-w-5xl mx-auto mb-16 mt-32">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="border border-[#F5A623]/20 bg-gradient-to-br from-[#1A1105] to-[#0A0713] shadow-[0_0_50px_rgba(245,166,35,0.05)] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#F5A623]/10 blur-[120px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2" />
              <CardContent className="p-12 md:p-16 flex flex-col items-center text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight font-outfit leading-tight">
                  Pare de perder clientes<br/>na DM.
                </h2>
                <p className="text-lg text-[#9B8FC0] leading-relaxed max-w-xl mb-10 font-sans">
                  A configuração leva menos de 2 minutos. Resgate o controle do seu tempo e deixe sua agenda trabalhar para você.
                </p>
                <Button size="lg" className="bg-[#F5A623] text-[#0A0713] hover:bg-[#E09612] w-full sm:w-auto h-14 px-10 font-bold rounded-lg text-lg shadow-[0_0_30px_rgba(245,166,35,0.2)] transition-all" onClick={() => openAuthModal('register')}>
                  Criar meu link grátis
                </Button>
              </CardContent>
            </Card>
          </motion.div>
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
