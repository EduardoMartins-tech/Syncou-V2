import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Key, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../contexts/AuthContext';

const accountSchema = z.object({
  displayName: z.string().min(2, "O nome deve ter no mínimo 2 caracteres").max(60, "O nome pode ter no máximo 60 caracteres"),
});

const standardPasswordSchema = z.object({
  currentPassword: z.string().min(1, "A senha atual é obrigatória"),
  newPassword: z.string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/\d/, "Deve conter pelo menos um número")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Deve conter pelo menos um caractere especial"),
  confirmPassword: z.string().min(1, "A confirmação é obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const googlePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string()
    .min(8, "A nova senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/\d/, "Deve conter pelo menos um número")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Deve conter pelo menos um caractere especial"),
  confirmPassword: z.string().min(1, "A confirmação é obrigatória"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type AccountForm = z.infer<typeof accountSchema>;
type PasswordForm = z.infer<typeof standardPasswordSchema>;

export function DashboardAccount() {
  const { currentUser, getAuthHeaders, updateUser, refreshUser } = useAuth();
  const { notifySuccess, notifyError, notifyLoading, dismiss } = useNotification();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isGoogleUser = currentUser?.authProvider === 'google';

  const { register: registerAccount, handleSubmit: handleSubmitAccount, formState: { errors: accountErrors } } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      displayName: currentUser?.displayName || '',
    }
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<any>({
    resolver: zodResolver(isGoogleUser ? googlePasswordSchema : standardPasswordSchema),
  });

  const onSubmitAccount = async (data: AccountForm) => {
    setLoading(true);
    const loadingToast = notifyLoading('Salvando dados...');
    try {
      const success = await updateUser({ displayName: data.displayName });
      if (success) {
        dismiss(loadingToast);
        notifySuccess('Dados salvos com sucesso!');
      } else {
        dismiss(loadingToast);
      }
    } catch (err) {
       dismiss(loadingToast);
       notifyError("Erro interno ao salvar dados.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPassword = async (data: any) => {
    setPasswordLoading(true);
    const loadingToast = notifyLoading('Atualizando senha...');
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
           ...getAuthHeaders(),
           'Content-Type': 'application/json'
        },
        body: JSON.stringify({
           currentPassword: data.currentPassword,
           newPassword: data.newPassword
        })
      });

      if (res.ok) {
         dismiss(loadingToast);
         notifySuccess('Senha atualizada com sucesso!');
         resetPassword();
         if (isGoogleUser) {
           await refreshUser();
         }
      } else {
         const errData = await res.json();
         dismiss(loadingToast);
         notifyError(errData.error || 'Erro ao atualizar senha.');
      }
    } catch (err) {
       dismiss(loadingToast);
       notifyError("Erro interno ao atualizar senha.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Conta</h1>
        <p className="text-muted-foreground">Gerencie suas informações de acesso e configurações da conta.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-card border-border shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
               <User className="w-5 h-5 text-primary" /> Detalhes Pessoais
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Suas informações principais de acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAccount(onSubmitAccount)} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={currentUser?.avatarUrl || ''} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                    {currentUser?.displayName?.charAt(0) || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1 text-center sm:text-left">
                  <p className="text-sm text-foreground">Sua foto pública</p>
                  <p className="text-xs text-muted-foreground">
                    Para trocar sua foto, acesse <span className="font-medium text-primary">Loja</span> — ela é editada junto com o resto do seu perfil público.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-muted-foreground">Nome</Label>
                    <Input 
                      {...registerAccount('displayName')} 
                      className="bg-muted border-border text-foreground focus-visible:ring-primary" 
                      placeholder="Seu nome"
                    />
                    {accountErrors.displayName && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">{accountErrors.displayName.message as string}</p>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Label className="text-muted-foreground">E-mail</Label>
                    <Input disabled value={currentUser?.email || ''} className="bg-muted/50 border-border/50 text-foreground opacity-70" />
                 </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Salvar Alterações
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
               <Key className="w-5 h-5 text-primary" /> {isGoogleUser ? 'Criar Senha de Acesso' : 'Alterar Senha'}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isGoogleUser ? 'Defina uma senha para poder acessar sua conta também via e-mail.' : 'Atualize sua senha de acesso ao painel.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              {!isGoogleUser && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Senha Atual</Label>
                  <Input type="password" {...registerPassword('currentPassword')} className="bg-muted border-border text-foreground focus-visible:ring-primary" />
                  {passwordErrors.currentPassword && <p className="text-red-600 dark:text-red-400 text-sm">{passwordErrors.currentPassword.message as string}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nova Senha</Label>
                <Input type="password" {...registerPassword('newPassword')} className="bg-muted border-border text-foreground focus-visible:ring-primary" />
                {passwordErrors.newPassword && <p className="text-red-600 dark:text-red-400 text-sm">{passwordErrors.newPassword.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Confirmar Nova Senha</Label>
                <Input type="password" {...registerPassword('confirmPassword')} className="bg-muted border-border text-foreground focus-visible:ring-primary" />
                {passwordErrors.confirmPassword && <p className="text-red-600 dark:text-red-400 text-sm">{passwordErrors.confirmPassword.message as string}</p>}
              </div>
              <div className="pt-2">
                 <Button
                   type="submit"
                   loading={passwordLoading}
                   className="w-full bg-muted border border-border text-foreground hover:text-foreground hover:bg-muted/70"
                 >
                   {isGoogleUser ? 'Salvar Senha' : 'Atualizar Senha'}
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
               <CreditCard className="w-5 h-5 text-primary" /> Assinatura
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Detalhes do seu plano atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="p-4 rounded-lg bg-muted border border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Plano Teste (Beta)</h3>
                  <p className="text-sm text-muted-foreground">Acesso total liberado</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                  Ativo
                </div>
             </div>
             <p className="text-sm text-muted-foreground">
               Em breve você poderá gerenciar sua assinatura, métodos de pagamento e faturas por aqui.
             </p>
             <Button disabled className="w-full bg-muted border border-border text-muted-foreground">
               Gerenciar Assinatura (Em breve)
             </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
