import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Mail, Lock, Loader2, Check } from 'lucide-react';
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

const FEATURES = [
  {
    label: 'Sincronia em tempo real',
    body: 'Conectado ao Google Agenda. O que você marca lá bloqueia aqui — sem digitar de novo.',
  },
  {
    label: 'Zero conflitos',
    body: 'Horário preenchido nunca aparece livre pro cliente. Ponto final.',
  },
  {
    label: 'Seu link, sua marca',
    body: 'syncou.app/p/seu-nome. Cola na bio, manda no story, fixa na conversa do WhatsApp.',
  },
  {
    label: 'Avisos sem barulho',
    body: 'Você recebe um aviso discreto. Seu cliente recebe um lembrete pra não furar.',
  },
];

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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      <header className="fixed top-0 w-full bg-background/90 backdrop-blur-sm border-b border-border z-50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="w-7 h-7 text-primary" />
            <span className="font-extrabold text-lg tracking-tight text-foreground">Syncou</span>
          </div>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium" onClick={() => openAuthModal('login')}>Entrar</Button>
            <Button variant="cta" className="font-semibold" onClick={() => openAuthModal('register')}>
              Criar minha conta
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-20 px-5">
        {/* HERO */}
        <section className="max-w-5xl mx-auto mb-28 grid lg:grid-cols-2 gap-14 items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-5xl md:text-[3.4rem] font-extrabold tracking-tight mb-6 text-foreground leading-[1.08]">
              Pare de fazer seu cliente tirar senha no WhatsApp.
            </h1>
            <p className="text-lg text-muted-foreground mb-9 max-w-lg leading-relaxed">
              Envie um link. Ele escolhe o horário. Sua agenda se preenche sozinha, sem você largar o que está fazendo pra responder "oi, tem horário quinta?".
            </p>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <Button size="lg" variant="cta" className="text-base h-13 px-7 font-semibold" onClick={() => openAuthModal('register')}>
                Criar meu link grátis
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-13">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Configuração em 2 minutos</span>
              </div>
            </div>
          </motion.div>

          {/* Signature element: a live preview of the booking widget itself */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="bg-card border border-border rounded-2xl shadow-xl shadow-primary/5 overflow-hidden max-w-[340px] mx-auto">
              <div className="p-5 pb-4 flex items-center gap-3 border-b border-border">
                <div className="w-10 h-10 rounded-full bg-accent text-primary flex items-center justify-center font-extrabold text-sm shrink-0">MS</div>
                <div>
                  <p className="font-bold text-sm text-foreground leading-tight">Marina Souza</p>
                  <p className="text-xs text-muted-foreground">Manicure &amp; Nail Design</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between bg-accent/60 border border-primary/20 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Alongamento em gel</p>
                    <p className="font-mono text-xs text-muted-foreground mt-0.5">60 min</p>
                  </div>
                  <span className="font-mono font-semibold text-sm text-foreground">R$ 90</span>
                </div>
                <div className="flex gap-2">
                  {['Qui 04', 'Sex 05', 'Sáb 06'].map((d, i) => (
                    <div key={d} className={`flex-1 text-center rounded-lg py-2 text-xs font-mono font-medium border ${i === 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-muted-foreground'}`}>
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['13:00', '14:30', '16:00'].map((t, i) => (
                    <div key={t} className={`text-center rounded-lg py-2 text-xs font-mono font-medium border ${i === 1 ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground'}`}>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t border-border bg-background flex items-center justify-between">
                <div className="text-xs">
                  <p className="text-muted-foreground">Sex 05 · 14:30</p>
                  <p className="font-mono font-semibold text-foreground">R$ 90</p>
                </div>
                <div className="bg-cta-strong text-cta-foreground text-sm font-bold px-4 py-2.5 rounded-lg">
                  Confirmar
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FEATURES — ruled rows, not decorative cards */}
        <section className="max-w-3xl mx-auto mb-28">
          <p className="font-mono text-xs tracking-widest text-primary uppercase mb-3 pl-1 font-semibold">O que muda na sua semana</p>
          <div className="border-t border-border">
            {FEATURES.map((feature) => (
              <div key={feature.label} className="grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-8 py-6 border-b border-border">
                <h3 className="text-xl font-bold text-foreground">{feature.label}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-md">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-2xl mx-auto text-center">
          <div className="border border-border rounded-2xl p-12 md:p-14 bg-card shadow-sm">
            <p className="font-mono text-xs tracking-widest text-primary uppercase mb-4 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full inline-block">Sem mais fila</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5 text-foreground leading-tight">
              Pare de perder cliente pra fila do WhatsApp.
            </h2>
            <p className="text-muted-foreground leading-relaxed max-w-md mx-auto mb-9">
              Leva 2 minutos pra configurar. O resto a sua agenda faz sozinha.
            </p>
            <Button size="lg" variant="cta" className="h-13 px-10 font-semibold" onClick={() => openAuthModal('register')}>
              Criar meu link grátis
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-5 flex flex-col items-center gap-4 text-center text-muted-foreground text-sm">
          <div className="flex gap-4">
            <Link to="/termos" className="hover:text-foreground transition-colors">Termos de Serviço e Privacidade</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Syncou. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* Auth Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-[440px] bg-card border-border text-foreground p-8 shadow-2xl">
          <>
            <DialogHeader className="space-y-2">
              <div className="mx-auto flex items-center justify-center mb-4">
                <Logo className="w-11 h-11 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-bold text-center text-foreground tracking-tight">
                {authMode === 'login'
                  ? 'Entrar no Syncou'
                  : 'Crie sua conta'
                }
              </DialogTitle>
              <DialogDescription className="text-center text-muted-foreground text-sm">
                {authMode === 'login'
                  ? 'Entre para gerenciar seus agendamentos'
                  : 'Comece a receber agendamentos de forma elegante'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 p-1 bg-muted rounded-lg my-6 border border-border">
              <button
                onClick={() => setAuthMode('login')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'login'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => setAuthMode('register')}
                className={`py-2 text-sm font-medium rounded-md transition-all ${
                  authMode === 'register'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Criar Conta
              </button>
            </div>

            <div className="space-y-5">
              <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
                {authMode === 'register' && authStep === 'otp' ? (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-right-4">
                    <Label htmlFor="auth-otp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Código de Verificação
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                      <Input
                        id="auth-otp"
                        type="text"
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="Ex: 123456"
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 pl-10 focus-visible:ring-primary h-11 shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Enviamos um código para {email}.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="auth-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <Input
                          id="auth-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="voce@exemplo.com"
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 pl-10 focus-visible:ring-primary h-11 shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auth-password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <Input
                          id="auth-password"
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authMode === 'register' ? "Mínimo 6 caracteres" : "Sua senha"}
                          className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 pl-10 focus-visible:ring-primary h-11 shadow-sm"
                        />
                      </div>

                      {authMode === 'register' && (
                        <div className="pt-2 space-y-1.5 flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-xs">
                            {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                            <span className={hasMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>Mínimo de 6 caracteres</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasUppercase ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                            <span className={hasUppercase ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>1 letra maiúscula</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                            <span className={hasNumber ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>1 número</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {hasSpecialChar ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />}
                            <span className={hasSpecialChar ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>1 caractere especial</span>
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
                      className="mt-1 w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-card focus:ring-offset-2 shrink-0 accent-primary cursor-pointer"
                    />
                    <label
                      htmlFor="terms"
                      className="text-xs font-medium leading-relaxed text-muted-foreground cursor-pointer"
                    >
                      Eu li e concordo com os{" "}
                      <Link to="/termos" target="_blank" className="font-semibold text-primary hover:text-primary/80 transition-colors">
                        Termos de Serviço e Política de Privacidade
                      </Link>.
                    </label>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="cta"
                  disabled={isSubmitting || (authMode === 'register' && authStep === 'form' && (!isValidPassword || !hasAcceptedTerms))}
                  className="w-full font-medium h-11 transition-all flex items-center justify-center gap-2 mt-4"
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
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-3 text-muted-foreground/80 uppercase tracking-widest font-medium">ou</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={isGoogleSubmitting || (authMode === 'register' && !hasAcceptedTerms)}
                    onClick={handleGoogleSignIn}
                    className="w-full border-border bg-background hover:bg-muted text-foreground font-medium h-11 shadow-sm"
                  >
                    {isGoogleSubmitting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-muted-foreground" />
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
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline decoration-muted-foreground/50 underline-offset-4 transition-all"
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
