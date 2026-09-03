import { useState, useEffect, ChangeEvent } from 'react';
import { useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, ExternalLink, Upload, User, Plus, Trash2, CalendarX2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '../contexts/AuthContext';
import { googleSignInForCalendar } from '../lib/firebase';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotification } from '../hooks/useNotification';

const slugSchema = z.object({
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens").max(60),
  displayName: z.string().min(2).max(100),
  bio: z.string().max(500).optional(),
  workingHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use formato HH:MM (ex: 09:00)"),
  workingHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use formato HH:MM (ex: 18:00)"),
  workingDays: z.array(z.number()),
  workOnHolidays: z.boolean().optional(),
  whatsapp: z.string().optional(),
  whatsappMessageTemplate: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

type SettingsForm = z.infer<typeof slugSchema>;

import { useLocation } from 'react-router-dom';
export function DashboardSettings() {
  const location = useLocation();
  const { currentUser, getAuthHeaders, updateUser } = useAuth();
  const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();

  useEffect(() => {
    if (location.hash === '#google-calendar') {
      setTimeout(() => {
        const el = document.getElementById('google-calendar');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500); // Wait a bit for layout to settle
    }
  }, [location.hash]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentSlug, setCurrentSlug] = useState('');
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, { start: string; end: string; isClosed: boolean }>>({});
  
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStart, setOverrideStart] = useState('09:00');
  const [overrideEnd, setOverrideEnd] = useState('18:00');
  const [overrideIsClosed, setOverrideIsClosed] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [multipleClosedDates, setMultipleClosedDates] = useState<Date[] | undefined>([]);
  const [savingMultiple, setSavingMultiple] = useState(false);

  const handleMarkMultipleAsClosed = async () => {
    if (!currentUser || !multipleClosedDates || multipleClosedDates.length === 0) return;
    setSavingMultiple(true);
    
    try {
      const newOverrides = { ...scheduleOverrides };
      for (const date of multipleClosedDates) {
        const dateKey = format(date, 'yyyy-MM-dd');
        newOverrides[dateKey] = {
          start: '00:00',
          end: '23:59',
          isClosed: true
        };
      }
      
      await updateUser({ scheduleOverrides: newOverrides });
      setScheduleOverrides(newOverrides);
      notifySuccess(`${multipleClosedDates.length} dia(s) marcado(s) como fechado(s)!`);
      setMultipleClosedDates([]);
    } catch (err) {
      console.error(err);
      notifyError("Erro ao adicionar exceções.");
    } finally {
      setSavingMultiple(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      const result = await googleSignInForCalendar();
      if (result?.accessToken) {
         // Save the token to backend
         await fetch('/api/users/google-token', {
           method: 'POST',
           headers: {
             ...getAuthHeaders(),
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({ token: result.accessToken }),
         });
         setGoogleCalendarConnected(true);
         notifySuccess("Google Agenda conectado com sucesso!");
      }
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
         notifyError("Falha ao conectar Google Agenda.");
      }
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      const res = await fetch('/api/users/google-token', {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setGoogleCalendarConnected(false);
        notifySuccess("Google Agenda desconectado.");
      } else {
        notifyError("Falha ao desconectar o Google Agenda.");
      }
    } catch (err) {
      notifyError("Erro interno ao desconectar.");
    }
  };

  const handleTestGoogleCalendar = async () => {
    try {
      const loadingToast = notifyLoading("Enviando evento de teste...");
      const res = await fetch('/api/users/test-calendar', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      dismiss(loadingToast);
      
      if (res.ok) {
        notifySuccess("✅ Evento de teste criado! Verifique seu Google Calendar.");
      } else {
        const errorData = await res.json();
        notifyError(`❌ Erro ao sincronizar: ${errorData.error}. Por favor, reconecte sua conta e use o botão "Sincronizar" na Dashboard para tentar novamente.`, { duration: 8000 });
      }
    } catch (err) {
      notifyError("Erro interno ao testar conexão. Por favor, reconecte e use o botão Sincronizar na Dashboard.");
    }
  };

  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm<SettingsForm>({
    resolver: zodResolver(slugSchema),
    defaultValues: {
      slug: '',
      displayName: '',
      bio: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      workingDays: [1, 2, 3, 4, 5],
      whatsapp: '',
      whatsappMessageTemplate: '',
      avatarUrl: '',
    }
  });

  const watchedDisplayName = watch('displayName');
  const watchedBio = watch('bio');
  const watchedSlug = watch('slug');
  const watchedAvatarUrl = watch('avatarUrl');

  // Prevent tab close if dirty
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Prevent navigation if dirty
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  );


  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      notifyError('A imagem não pode ter mais que 2MB');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
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
          setUploading(false);
        };
        img.onerror = () => {
          notifyError("Erro ao carregar a imagem.");
          setUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        notifyError("Erro ao ler o arquivo.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro no upload', err);
      notifyError('Falha ao processar a imagem');
      setUploading(false);
    }
  };

  useEffect(() => {
     if (currentUser) {
        console.log("currentUser from server:", currentUser);
        setCurrentSlug(currentUser.slug || '');
        setScheduleOverrides(currentUser.scheduleOverrides || {});
        
        if (currentUser.googleAccessToken) {
           setGoogleCalendarConnected(true);
        }
        
        let parsedWorkingDays = [1, 2, 3, 4, 5];
        if (Array.isArray(currentUser.workingDays)) {
           parsedWorkingDays = currentUser.workingDays.map(Number);
        } else if (typeof currentUser.workingDays === 'string') {
           try {
              parsedWorkingDays = JSON.parse(currentUser.workingDays).map(Number);
           } catch(e) {}
        }

        reset({
          slug: currentUser.slug || '',
          displayName: currentUser.displayName || '',
          bio: currentUser.bio || '',
          workingHoursStart: currentUser.workingHoursStart || '09:00',
          workingHoursEnd: currentUser.workingHoursEnd || '18:00',
          workingDays: parsedWorkingDays,
          workOnHolidays: currentUser.workOnHolidays || false,
          whatsapp: currentUser.whatsapp || '',
          whatsappMessageTemplate: currentUser.whatsappMessageTemplate || '',
          avatarUrl: currentUser.avatarUrl || '',
        });
     }
  }, [currentUser, reset]);

  const onSubmit = async (data: SettingsForm) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const cleanWhatsapp = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : '';
      const payload = {
        slug: data.slug,
        displayName: data.displayName,
        bio: data.bio || '',
        workingHoursStart: data.workingHoursStart,
        workingHoursEnd: data.workingHoursEnd,
        workingDays: JSON.stringify(data.workingDays),
        workOnHolidays: data.workOnHolidays,
        whatsapp: cleanWhatsapp,
        whatsappMessageTemplate: data.whatsappMessageTemplate,
        avatarUrl: data.avatarUrl,
      };

      await updateUser(payload);
      setCurrentSlug(data.slug);
      reset(data);
      notifySuccess("Perfil atualizado com sucesso!");
    } catch (err: any) {
      console.error("Erro real ao salvar:", err);
      notifyError(err.message || "Erro ao atualizar perfil. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOverride = async () => {
    if (!currentUser || !overrideDate) return;
    setSavingOverride(true);
    
    try {
      const newOverrides = {
        ...scheduleOverrides,
        [overrideDate]: {
          start: overrideStart,
          end: overrideEnd,
          isClosed: overrideIsClosed
        }
      };
      
      await updateUser({ scheduleOverrides: newOverrides });
      setScheduleOverrides(newOverrides);
      notifySuccess("Exceção adicionada com sucesso!");
      
      // Reset form
      setOverrideDate('');
      setOverrideIsClosed(false);
    } catch (err) {
      console.error(err);
      notifyError("Erro ao adicionar exceção.");
    } finally {
      setSavingOverride(false);
    }
  };

  const handleRemoveOverride = async (dateKey: string) => {
    if (!currentUser) return;
    try {
      const newOverrides = { ...scheduleOverrides };
      delete newOverrides[dateKey];
      
      await updateUser({ scheduleOverrides: newOverrides });
      setScheduleOverrides(newOverrides);
      notifySuccess("Exceção removida com sucesso!");
    } catch (err) {
      console.error(err);
      notifyError("Erro ao remover exceção.");
    }
  };

  const domain = window.location.origin;
  const publicUrl = `${domain}/p/${currentSlug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    notifySuccess("Link copiado para a área de transferência!");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-in fade-in duration-500 overflow-hidden">
      <Dialog open={blocker.state === "blocked"} onOpenChange={(open) => { if (!open && blocker.state === "blocked") blocker.reset(); }}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair sem salvar?</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Você tem alterações não salvas. Se você sair agora, suas alterações serão perdidas. Deseja sair mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => blocker.state === "blocked" && blocker.reset()} className="text-muted-foreground hover:text-foreground hover:bg-muted">
              Continuar editando
            </Button>
            <Button variant="destructive" onClick={() => blocker.state === "blocked" && blocker.proceed()}>
              Sair sem salvar
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                handleSubmit(async (data) => {
                  await onSubmit(data);
                  if (blocker.state === "blocked") blocker.proceed();
                })();
              }}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="xl:col-span-2 space-y-8"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Loja</h1>
          <p className="text-muted-foreground">Gerencie seu perfil público e seu link de agendamento.</p>
        </div>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Seu Link Público</CardTitle>
            <CardDescription className="text-muted-foreground">
              Este é o link que você compartilhará com seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-muted border border-border rounded-xl">
              <div className="flex-1 font-mono text-foreground text-sm sm:text-base break-all">
                syncou.app/p/<span className="text-primary font-bold">{currentSlug || 'sua-slug-aqui'}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button onClick={copyLink} variant="secondary" className="flex-1 sm:flex-none">
                   <Copy className="w-4 h-4 mr-2" />
                   Copiar
                 </Button>
                 <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center flex-1 sm:flex-none bg-primary text-primary-foreground hover:bg-primary/80 rounded-md text-sm font-medium h-9 px-4 py-2">
                   <ExternalLink className="w-4 h-4 mr-2" />
                   Ver
                 </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* INFORMAÇÕES PESSOAIS E DE CONTATO */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Informações Básicas</CardTitle>
              <CardDescription className="text-muted-foreground">
                Personalize como os clientes verão você em sua página de agendamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-border">
                <Avatar className="w-24 h-24 border-2 border-border">
                  <AvatarImage src={watchedAvatarUrl || ''} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                    {watchedDisplayName?.charAt(0) || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-muted border-border text-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/70"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                      loading={uploading}
                    >
                      {!uploading && <Upload className="w-4 h-4" />}
                      Alterar Foto
                    </Button>
                    {watchedAvatarUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setValue('avatarUrl', '', { shouldDirty: true, shouldValidate: true })}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">JPG ou PNG. Tamanho máximo 2MB. Essa é a foto que os clientes veem na sua página pública.</p>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input type="hidden" {...register('avatarUrl')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug" className="text-foreground">Identificador URL (Slug)</Label>
                <div className="flex bg-muted rounded-lg border border-border focus-within:ring-1 focus-within:ring-primary overflow-hidden">
                  <span className="flex items-center shrink-0 whitespace-nowrap px-2.5 sm:px-4 bg-card text-muted-foreground border-r border-border text-xs sm:text-sm">
                    syncou.app/p/
                  </span>
                  <input
                    id="slug"
                    {...register('slug')}
                    className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    placeholder="seu-nome"
                  />
                </div>
                {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
                <p className="text-xs text-muted-foreground/70">Apenas letras minúsculas, números e hífens.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  className="bg-muted border-border text-foreground focus-visible:ring-primary h-11"
                />
                {errors.displayName && <p className="text-destructive text-sm">{errors.displayName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">Bio / Descrição</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  className="bg-muted border-border text-foreground focus-visible:ring-primary min-h-[100px] placeholder:text-muted-foreground"
                  placeholder="Conte um pouco sobre você, sua formação ou seus serviços..."
                />
                {errors.bio && <p className="text-destructive text-sm">{errors.bio.message}</p>}
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold tracking-wide text-foreground mb-4">Contato Direto (Opcional)</h4>
                <Label htmlFor="whatsapp" className="text-foreground">Número de WhatsApp</Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  className="bg-muted border-border text-foreground focus-visible:ring-primary h-11 placeholder:text-muted-foreground"
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-xs text-muted-foreground/70">Adicione o DDI e DDD (ex: 5511999999999) para que clientes possam enviar mensagens.</p>
                {errors.whatsapp && <p className="text-destructive text-sm">{errors.whatsapp.message}</p>}
                
                <div className="flex items-center justify-between mt-4 mb-1">
                  <Label htmlFor="whatsappMessageTemplate" className="text-foreground block">Mensagem de Confirmação (WhatsApp)</Label>
                </div>
                <Textarea
                  id="whatsappMessageTemplate"
                  {...register('whatsappMessageTemplate')}
                  className="bg-muted border-border text-foreground focus-visible:ring-primary min-h-[100px] placeholder:text-muted-foreground"
                  placeholder="Ex: Olá {NOME}, passando para confirmar seu agendamento de {SERVICOS} no dia {DATA} às {HORA}. Te aguardo!"
                />
                <p className="text-xs text-muted-foreground/70">Você pode usar as aspas dinâmicas: {"{NOME}"}, {"{SERVICOS}"}, {"{DATA}"} e {"{HORA}"}.</p>
              </div>
            </CardContent>
          </Card>

          {/* HORÁRIOS PADRÃO */}
          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-foreground">Disponibilidade Padrão</CardTitle>
              <CardDescription className="text-muted-foreground">
                Configure os dias úteis e a janela geral de horários em que você aceita agendamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart" className="text-foreground">Horário de Início</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    {...register('workingHoursStart')}
                    className="bg-muted border-border text-foreground focus-visible:ring-primary block h-11"
                  />
                  {errors.workingHoursStart && <p className="text-destructive text-sm">{errors.workingHoursStart.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd" className="text-foreground">Horário de Fim</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    {...register('workingHoursEnd')}
                    className="bg-muted border-border text-foreground focus-visible:ring-primary block h-11"
                  />
                  {errors.workingHoursEnd && <p className="text-destructive text-sm">{errors.workingHoursEnd.message}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                 <Label className="text-foreground">Dias de Funcionamento</Label>
                 <div className="flex flex-wrap gap-2">
                   {DAYS_OF_WEEK.map(day => {
                     const rawWorkingDays = watch('workingDays') || [];
                     const workingDays = Array.isArray(rawWorkingDays) ? rawWorkingDays.map(Number) : [];
                     const isSelected = workingDays.includes(day.value);
                     return (
                       <button
                         key={day.value}
                         type="button"
                         onClick={() => {
                           const currentDays = workingDays;
                           let newDays;
                           if (isSelected) {
                             newDays = currentDays.filter((d: number) => d !== day.value);
                           } else {
                             newDays = [...currentDays, day.value].sort((a, b) => a - b);
                           }
                           setValue('workingDays', newDays, { shouldDirty: true, shouldValidate: true });
                         }}
                         className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition ease-snappy focus-ring ${
                           isSelected 
                             ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                             : 'bg-muted border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                         }`}
                       >
                         {day.label}
                       </button>
                     );
                   })}
                 </div>
                 {errors.workingDays && <p className="text-destructive text-sm">{errors.workingDays.message}</p>}
              </div>

              <div className="space-y-3 pt-4 border-t border-border/50">
                 <div className="flex flex-col gap-2">
                   <Label className="text-foreground">Feriados Nacionais</Label>
                   <p className="text-sm text-muted-foreground">
                     Deseja permitir agendamentos em datas que caem em feriados nacionais fixos (como 01/01, 25/12, etc.)?
                   </p>
                 </div>
                 <div className="flex items-center gap-3">
                   <button
                     type="button"
                     onClick={() => setValue('workOnHolidays', !watch('workOnHolidays'), { shouldDirty: true, shouldValidate: true })}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ease-snappy focus-ring ${
                       watch('workOnHolidays') ? 'bg-primary' : 'bg-muted'
                     }`}
                   >
                     <span
                       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                         watch('workOnHolidays') ? 'translate-x-6' : 'translate-x-1'
                       }`}
                     />
                   </button>
                   <span className="text-sm text-foreground">
                     {watch('workOnHolidays') ? 'Trabalhar normalmente nos feriados' : 'Não permitir agendamentos em feriados'}
                   </span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 rounded-xl border border-border sticky bottom-4 z-10 shadow-lg">
             <div className="text-sm text-muted-foreground">
                Lembre-se de salvar suas alterações para atualizar a página pública.
             </div>
             <Button type="submit" loading={loading} className="w-full sm:w-auto min-w-[150px] shadow-sm">
               Salvar Alterações
             </Button>
          </div>
        </form>

        {/* Horários Especiais / Exceções */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center gap-2">
              <CalendarX2 className="w-5 h-5 text-primary" />
              Horários Especiais
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Adicione exceções para dias específicos em que você fará outro horário ou não trabalhará (férias, feriados).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 items-end bg-muted p-4 rounded-xl border border-border">
              <div className="space-y-2 w-full md:w-auto">
                <Label htmlFor="overrideDate" className="text-foreground">Data *</Label>
                <Input
                  id="overrideDate"
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="bg-card border-border text-foreground focus-visible:ring-primary block min-w-[150px] h-11"
                />
              </div>
              
              {!overrideIsClosed && (
                <>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideStart" className="text-foreground">Início</Label>
                    <Input
                      id="overrideStart"
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      className="bg-card border-border text-foreground focus-visible:ring-primary block h-11"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideEnd" className="text-foreground">Fim</Label>
                    <Input
                      id="overrideEnd"
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      className="bg-card border-border text-foreground focus-visible:ring-primary block h-11"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2 mb-3 w-full md:w-auto">
                <input 
                  type="checkbox" 
                  id="overrideIsClosed"
                  checked={overrideIsClosed}
                  onChange={(e) => setOverrideIsClosed(e.target.checked)}
                  className="w-4 h-4 rounded border-border bg-card text-primary focus-ring"
                />
                <Label htmlFor="overrideIsClosed" className="text-sm font-medium text-foreground cursor-pointer">
                  Não trabalharei
                </Label>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddOverride}
                loading={savingOverride}
                disabled={!overrideDate}
                className="w-full md:w-auto h-11"
              >
                {!savingOverride && <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-xl border border-border flex flex-col md:flex-row gap-6 items-start">
               <div>
                  <h4 className="text-foreground font-medium mb-1">Selecionar Múltiplos Dias</h4>
                  <p className="text-sm text-muted-foreground mb-4">Clique nos dias no calendário para marcá-os como "Folga" ou "Fechado".</p>
                  <div className="w-full overflow-x-auto">
                    <Calendar
                      mode="multiple"
                      selected={multipleClosedDates}
                      onSelect={setMultipleClosedDates}
                      locale={ptBR}
                      className="bg-card border border-border rounded-lg p-3 text-foreground max-w-fit pointer-events-auto"
                    />
                  </div>
               </div>
               <div className="flex flex-col justify-end h-full mt-auto mb-2 space-y-3">
                  <div className="p-3 bg-muted border border-border rounded-lg">
                    <p className="text-sm text-foreground">
                      <strong>{multipleClosedDates?.length || 0}</strong> dia(s) selecionado(s)
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleMarkMultipleAsClosed}
                    loading={savingMultiple}
                    disabled={!multipleClosedDates?.length}
                    className="w-full sm:w-auto h-11"
                  >
                    {!savingMultiple && <CalendarX2 className="w-4 h-4" />}
                    Marcar como Fechado
                  </Button>
               </div>
            </div>

            {Object.keys(scheduleOverrides).length > 0 ? (
              <div className="space-y-3">
                <Label className="text-muted-foreground text-sm font-semibold uppercase tracking-wider">Exceções Cadastradas</Label>
                <div className="grid gap-3">
                  {Object.entries(scheduleOverrides).sort((a,b) => a[0].localeCompare(b[0])).map(([dateKey, override]: readonly [string, any]) => {
                    const [year, month, day] = dateKey.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    
                    return (
                      <div key={dateKey} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted">
                        <div>
                          <p className="font-bold text-foreground">{formattedDate}</p>
                          <p className="text-sm text-muted-foreground">
                            {override.isClosed 
                              ? <span className="text-destructive font-medium">Dia Fechado</span>
                              : <span>Aberto das {override.start} às {override.end}</span>
                            }
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveOverride(dateKey)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
               <div className="text-center py-6 text-muted-foreground/70 text-sm border border-border border-dashed rounded-xl bg-muted">
                 Nenhuma exceção cadastrada.
               </div>
            )}
          </CardContent>
        </Card>

        {/* INTEGRATIONS SETTINGS */}
        <Card id="google-calendar" className="bg-card border-border shadow-sm mt-8 scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
               <CalendarIcon className="w-5 h-5 text-primary" />
               Integrações
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Conecte sua conta do Google Calendar para sincronizar agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted rounded-xl border border-border">
               <div>
                  <h4 className="font-medium text-foreground mb-1">Google Calendar</h4>
                  <p className="text-sm text-muted-foreground/70">Agende e sincronize eventos automaticamente.</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                 {googleCalendarConnected && (
                   <>
                     <Button
                       type="button"
                       variant="outline"
                       onClick={handleTestGoogleCalendar}
                       className="bg-transparent text-foreground border-border hover:bg-muted hover:text-foreground transition font-medium shadow-sm"
                     >
                       Enviar evento de teste
                     </Button>
                     <Button
                       type="button"
                       variant="ghost"
                       onClick={handleDisconnectGoogleCalendar}
                       className="text-destructive hover:text-destructive hover:bg-destructive/10"
                     >
                       Desconectar
                     </Button>
                   </>
                 )}
                 <Button
                   type="button"
                   onClick={handleConnectGoogleCalendar}
                   disabled={googleCalendarConnected}
                   className={`${googleCalendarConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-default' : 'bg-primary text-primary-foreground hover:bg-primary/90'} transition font-semibold shadow-sm`}
                 >
                   {googleCalendarConnected ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Conectado</>
                   ) : (
                      <><CalendarIcon className="w-4 h-4 mr-2" /> Conectar</>
                   )}
                 </Button>
               </div>
             </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* LIVE PREVIEW COLUMN */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="hidden xl:block"
      >
        <div className="sticky top-6">
          <Card className="bg-card border-border overflow-hidden shadow-2xl">
            <div className="h-28 bg-primary/20 relative">
               <div className="absolute inset-0 bg-muted/40" />
            </div>
            <CardContent className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 border-4 border-card bg-muted -mt-12 mb-4 shadow-xl">
                <AvatarImage src={watchedAvatarUrl || ''} className="object-cover" />
                <AvatarFallback className="bg-muted text-muted-foreground text-2xl font-bold">
                  {watchedDisplayName?.charAt(0) || <User className="w-10 h-10" />}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-xl font-bold text-foreground mb-1">{watchedDisplayName || 'Seu Nome Aqui'}</h3>
              <p className="text-sm font-medium text-primary mb-4 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-mono">
                syncou.app/p/{watchedSlug || 'seu-link'}
              </p>
              
              {watchedBio ? (
                <p className="text-sm text-foreground leading-relaxed max-w-[250px] whitespace-pre-wrap">
                  {watchedBio}
                </p>
              ) : (
                <div className="space-y-2 w-full mt-2 opacity-50">
                  <div className="h-2 w-full bg-muted rounded mx-auto" />
                  <div className="h-2 w-5/6 bg-muted rounded mx-auto" />
                  <div className="h-2 w-4/6 bg-muted rounded mx-auto" />
                </div>
              )}
              
              <div className="mt-8 border-t border-border pt-6 w-full flex flex-col items-center justify-center space-y-4">
                 <div className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest">Prévia do Perfil</div>
                 <Button disabled variant="outline" className="w-full max-w-[200px] border-border bg-muted text-muted-foreground">
                    Agendar Horário
                 </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
