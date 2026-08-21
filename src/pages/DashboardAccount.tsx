import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, User, Key, CreditCard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../contexts/AuthContext';

const accountSchema = z.object({
  avatarUrl: z.string().optional().or(z.literal('')),
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
  const [uploading, setUploading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isGoogleUser = currentUser?.authProvider === 'google';

  const { register: registerAccount, handleSubmit: handleSubmitAccount, formState: { errors: accountErrors }, setValue, watch } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      avatarUrl: currentUser?.avatarUrl || '',
      displayName: currentUser?.displayName || '',
    }
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<any>({
    resolver: zodResolver(isGoogleUser ? googlePasswordSchema : standardPasswordSchema),
  });

  const avatarUrl = watch('avatarUrl');

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notifyError("A imagem deve ter no máximo 2MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setValue('avatarUrl', dataUrl, { shouldDirty: true, shouldValidate: true });
          } else {
             notifyError("Erro ao processar imagem.");
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      notifyError('Falha ao processar imagem.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmitAccount = async (data: AccountForm) => {
    setLoading(true);
    const loadingToast = notifyLoading('Salvando dados...');
    try {
      const success = await updateUser({ avatarUrl: data.avatarUrl, displayName: data.displayName });
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
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Conta</h1>
        <p className="text-[#9B8FC0]">Gerencie suas informações de acesso e configurações da conta.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="bg-[#130E20] border-[#2D214F] shadow-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
               <User className="w-5 h-5 text-violet-400" /> Detalhes Pessoais
            </CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              Sua foto de perfil e informações principais.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitAccount(onSubmitAccount)} className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <Avatar className="w-24 h-24 border-2 border-[#2D214F]">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-[#1A1333] text-[#9B8FC0] text-xl font-bold">
                    {currentUser?.displayName?.charAt(0) || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="bg-[#1A1333] border-[#2D214F] text-[#E2D9F3] hover:text-white hover:border-[#4B3B7A] hover:bg-[#2D214F]"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      disabled={uploading || loading}
                    >
                      <Upload className="w-4 h-4 mr-2" /> 
                      {uploading ? 'Processando...' : 'Alterar Foto'}
                    </Button>
                    {avatarUrl && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setValue('avatarUrl', '', { shouldDirty: true, shouldValidate: true })}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        disabled={loading}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-[#9B8FC0]">JPG ou PNG. Tamanho máximo 2MB.</p>
                  <input 
                    type="file" 
                    id="avatar-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload}
                  />
                  <input type="hidden" {...registerAccount('avatarUrl')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[#9B8FC0]">Nome</Label>
                    <Input 
                      {...registerAccount('displayName')} 
                      className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-[#8B5CF6]" 
                      placeholder="Seu nome"
                    />
                    {accountErrors.displayName && (
                      <p className="text-sm text-red-400 mt-1">{accountErrors.displayName.message as string}</p>
                    )}
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[#9B8FC0]">E-mail</Label>
                    <Input disabled value={currentUser?.email || ''} className="bg-[#0B0914]/50 border-[#2D214F]/50 text-white opacity-70" />
                 </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
               <Key className="w-5 h-5 text-violet-400" /> {isGoogleUser ? 'Criar Senha de Acesso' : 'Alterar Senha'}
            </CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              {isGoogleUser ? 'Defina uma senha para poder acessar sua conta também via e-mail.' : 'Atualize sua senha de acesso ao painel.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              {!isGoogleUser && (
                <div className="space-y-2">
                  <Label className="text-[#9B8FC0]">Senha Atual</Label>
                  <Input type="password" {...registerPassword('currentPassword')} className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500" />
                  {passwordErrors.currentPassword && <p className="text-red-400 text-sm">{passwordErrors.currentPassword.message as string}</p>}
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-[#9B8FC0]">Nova Senha</Label>
                <Input type="password" {...registerPassword('newPassword')} className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500" />
                {passwordErrors.newPassword && <p className="text-red-400 text-sm">{passwordErrors.newPassword.message as string}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[#9B8FC0]">Confirmar Nova Senha</Label>
                <Input type="password" {...registerPassword('confirmPassword')} className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500" />
                {passwordErrors.confirmPassword && <p className="text-red-400 text-sm">{passwordErrors.confirmPassword.message as string}</p>}
              </div>
              <div className="pt-2">
                 <Button 
                   type="submit" 
                   disabled={passwordLoading}
                   className="w-full bg-[#1A1333] border border-[#2D214F] text-[#E2D9F3] hover:text-white hover:bg-[#2D214F]"
                 >
                   {passwordLoading ? 'Atualizando...' : (isGoogleUser ? 'Salvar Senha' : 'Atualizar Senha')}
                 </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
               <CreditCard className="w-5 h-5 text-violet-400" /> Assinatura
            </CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              Detalhes do seu plano atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="p-4 rounded-lg bg-[#0B0914] border border-[#2D214F] flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white mb-1">Plano Teste (Beta)</h3>
                  <p className="text-sm text-[#9B8FC0]">Acesso total liberado</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider border border-violet-500/30">
                  Ativo
                </div>
             </div>
             <p className="text-sm text-[#9B8FC0]">
               Em breve você poderá gerenciar sua assinatura, métodos de pagamento e faturas por aqui.
             </p>
             <Button disabled className="w-full bg-[#1A1333] border border-[#2D214F] text-[#9B8FC0]">
               Gerenciar Assinatura (Em breve)
             </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
