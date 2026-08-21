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
import { Copy, ExternalLink, RefreshCw, Upload, User, Plus, Trash2, CalendarX2, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
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
          const MAX_SIZE = 256;
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
        <DialogContent className="bg-[#130E20] border-[#2D214F] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sair sem salvar?</DialogTitle>
            <DialogDescription className="text-[#9B8FC0]">
              Você tem alterações não salvas. Se você sair agora, suas alterações serão perdidas. Deseja sair mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => blocker.state === "blocked" && blocker.reset()} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
              Continuar editando
            </Button>
            <Button variant="destructive" onClick={() => blocker.state === "blocked" && blocker.proceed()} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border-none">
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
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
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
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Loja</h1>
          <p className="text-[#9B8FC0]">Gerencie seu perfil público e seu link de agendamento.</p>
        </div>

        <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white">Seu Link Público</CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              Este é o link que você compartilhará com seus clientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-center p-4 bg-[#0B0914] border border-[#2D214F] rounded-xl">
              <div className="flex-1 font-mono text-[#E2D9F3] text-sm sm:text-base break-all">
                syncou.app/<span className="text-violet-400 font-bold">{currentSlug || 'sua-slug-aqui'}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                 <Button onClick={copyLink} variant="secondary" className="flex-1 sm:flex-none bg-[#1A1333] hover:bg-[#2D214F] border border-[#2D214F] text-[#E2D9F3] hover:text-white">
                   <Copy className="w-4 h-4 mr-2" />
                   Copiar
                 </Button>
                 <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center flex-1 sm:flex-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-md text-sm font-medium h-9 px-4 py-2">
                   <ExternalLink className="w-4 h-4 mr-2" />
                   Ver
                 </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* INFORMAÇÕES PESSOAIS E DE CONTATO */}
          <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white">Informações Básicas</CardTitle>
              <CardDescription className="text-[#9B8FC0]">
                Personalize como os clientes verão você em sua página de agendamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-[#E2D9F3]">Identificador URL (Slug)</Label>
                <div className="flex bg-[#0B0914] rounded-lg border border-[#2D214F] focus-within:ring-1 focus-within:ring-violet-500 overflow-hidden">
                  <span className="flex items-center px-4 bg-[#130E20] text-[#9B8FC0] border-r border-[#2D214F] text-sm">
                    syncou.app/
                  </span>
                  <input
                    id="slug"
                    {...register('slug')}
                    className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[#5B4F81]"
                    placeholder="seu-nome"
                  />
                </div>
                {errors.slug && <p className="text-red-400 text-sm">{errors.slug.message}</p>}
                <p className="text-xs text-[#5B4F81]">Apenas letras minúsculas, números e hífens.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-[#E2D9F3]">Nome de Exibição</Label>
                <Input
                  id="displayName"
                  {...register('displayName')}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11"
                />
                {errors.displayName && <p className="text-red-400 text-sm">{errors.displayName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-[#E2D9F3]">Bio / Descrição</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 min-h-[100px] placeholder:text-[#5B4F81]"
                  placeholder="Conte um pouco sobre você, sua formação ou seus serviços..."
                />
                {errors.bio && <p className="text-red-400 text-sm">{errors.bio.message}</p>}
              </div>

              <div className="space-y-2 pt-4 border-t border-[#2D214F]">
                <h4 className="text-sm font-semibold tracking-wide text-white mb-4">Contato Direto (Opcional)</h4>
                <Label htmlFor="whatsapp" className="text-[#E2D9F3]">Número de WhatsApp</Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11 placeholder:text-[#5B4F81]"
                  placeholder="Ex: 5511999999999"
                />
                <p className="text-xs text-[#5B4F81]">Adicione o DDI e DDD (ex: 5511999999999) para que clientes possam enviar mensagens.</p>
                {errors.whatsapp && <p className="text-red-400 text-sm">{errors.whatsapp.message}</p>}
                
                <div className="flex items-center justify-between mt-4 mb-1">
                  <Label htmlFor="whatsappMessageTemplate" className="text-[#E2D9F3] block">Mensagem de Confirmação (WhatsApp)</Label>
                </div>
                <Textarea
                  id="whatsappMessageTemplate"
                  {...register('whatsappMessageTemplate')}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-[#8B5CF6] min-h-[100px] placeholder:text-[#5B4F81]"
                  placeholder="Ex: Olá {NOME}, passando para confirmar seu agendamento de {SERVICOS} no dia {DATA} às {HORA}. Te aguardo!"
                />
                <p className="text-xs text-[#5B4F81]">Você pode usar as aspas dinâmicas: {"{NOME}"}, {"{SERVICOS}"}, {"{DATA}"} e {"{HORA}"}.</p>
              </div>
            </CardContent>
          </Card>

          {/* HORÁRIOS PADRÃO */}
          <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-white">Disponibilidade Padrão</CardTitle>
              <CardDescription className="text-[#9B8FC0]">
                Configure os dias úteis e a janela geral de horários em que você aceita agendamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart" className="text-[#E2D9F3]">Horário de Início</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    {...register('workingHoursStart')}
                    className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                  />
                  {errors.workingHoursStart && <p className="text-red-400 text-sm">{errors.workingHoursStart.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd" className="text-[#E2D9F3]">Horário de Fim</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    {...register('workingHoursEnd')}
                    className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                  />
                  {errors.workingHoursEnd && <p className="text-red-400 text-sm">{errors.workingHoursEnd.message}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                 <Label className="text-[#E2D9F3]">Dias de Funcionamento</Label>
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
                         className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border cursor-pointer transition-all ${
                           isSelected 
                             ? 'bg-[#8B5CF6] border-[#8B5CF6] text-white shadow-sm' 
                             : 'bg-[#1A1333] border-[#2D214F] text-[#9B8FC0] hover:border-[#4B3B7A] hover:text-[#E2D9F3]'
                         }`}
                       >
                         {day.label}
                       </button>
                     );
                   })}
                 </div>
                 {errors.workingDays && <p className="text-red-400 text-sm">{errors.workingDays.message}</p>}
              </div>

              <div className="space-y-3 pt-4 border-t border-[#2D214F]/50">
                 <div className="flex flex-col gap-2">
                   <Label className="text-[#E2D9F3]">Feriados Nacionais</Label>
                   <p className="text-sm text-[#9B8FC0]">
                     Deseja permitir agendamentos em datas que caem em feriados nacionais fixos (como 01/01, 25/12, etc.)?
                   </p>
                 </div>
                 <div className="flex items-center gap-3">
                   <button
                     type="button"
                     onClick={() => setValue('workOnHolidays', !watch('workOnHolidays'), { shouldDirty: true, shouldValidate: true })}
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0A0713] ${
                       watch('workOnHolidays') ? 'bg-[#8B5CF6]' : 'bg-[#2D214F]'
                     }`}
                   >
                     <span
                       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                         watch('workOnHolidays') ? 'translate-x-6' : 'translate-x-1'
                       }`}
                     />
                   </button>
                   <span className="text-sm text-[#E2D9F3]">
                     {watch('workOnHolidays') ? 'Trabalhar normalmente nos feriados' : 'Não permitir agendamentos em feriados'}
                   </span>
                 </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#130E20] p-4 rounded-xl border border-[#2D214F] sticky bottom-4 z-10 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.5)]">
             <div className="text-sm text-[#9B8FC0]">
                Lembre-se de salvar suas alterações para atualizar a página pública.
             </div>
             <Button type="submit" disabled={loading} className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white min-w-[150px] shadow-sm">
               {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Salvar Alterações"}
             </Button>
          </div>
        </form>

        {/* Horários Especiais / Exceções */}
        <Card className="bg-[#130E20] border-[#2D214F] shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <CalendarX2 className="w-5 h-5 text-violet-400" />
              Horários Especiais
            </CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              Adicione exceções para dias específicos em que você fará outro horário ou não trabalhará (férias, feriados).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="flex flex-col md:flex-row gap-4 items-end bg-[#0B0914] p-4 rounded-xl border border-[#2D214F]">
              <div className="space-y-2 w-full md:w-auto">
                <Label htmlFor="overrideDate" className="text-[#E2D9F3]">Data *</Label>
                <Input
                  id="overrideDate"
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="bg-[#130E20] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert min-w-[150px] h-11"
                />
              </div>
              
              {!overrideIsClosed && (
                <>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideStart" className="text-[#E2D9F3]">Início</Label>
                    <Input
                      id="overrideStart"
                      type="time"
                      value={overrideStart}
                      onChange={(e) => setOverrideStart(e.target.value)}
                      className="bg-[#130E20] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-auto">
                    <Label htmlFor="overrideEnd" className="text-[#E2D9F3]">Fim</Label>
                    <Input
                      id="overrideEnd"
                      type="time"
                      value={overrideEnd}
                      onChange={(e) => setOverrideEnd(e.target.value)}
                      className="bg-[#130E20] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
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
                  className="w-4 h-4 rounded border-[#2D214F] bg-[#130E20] text-violet-500 focus:ring-violet-500 focus:ring-offset-[#0B0914]"
                />
                <Label htmlFor="overrideIsClosed" className="text-sm font-medium text-[#E2D9F3] cursor-pointer">
                  Não trabalharei
                </Label>
              </div>

              <Button 
                type="button" 
                onClick={handleAddOverride} 
                disabled={savingOverride || !overrideDate} 
                className="w-full md:w-auto bg-[#1A1333] hover:bg-[#2D214F] border border-[#2D214F] text-white h-11"
              >
                {savingOverride ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Adicionar
              </Button>
            </div>

            <div className="bg-[#0B0914] p-4 rounded-xl border border-[#2D214F] flex flex-col md:flex-row gap-6 items-start">
               <div>
                  <h4 className="text-white font-medium mb-1">Selecionar Múltiplos Dias</h4>
                  <p className="text-sm text-[#9B8FC0] mb-4">Clique nos dias no calendário para marcá-os como "Folga" ou "Fechado".</p>
                  <Calendar
                    mode="multiple"
                    selected={multipleClosedDates}
                    onSelect={setMultipleClosedDates}
                    locale={ptBR}
                    className="bg-[#130E20] border border-[#2D214F] rounded-lg p-3 text-white max-w-fit pointer-events-auto"
                  />
               </div>
               <div className="flex flex-col justify-end h-full mt-auto mb-2 space-y-3">
                  <div className="p-3 bg-[#1A1333] border border-[#2D214F] rounded-lg">
                    <p className="text-sm text-[#E2D9F3]">
                      <strong>{multipleClosedDates?.length || 0}</strong> dia(s) selecionado(s)
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleMarkMultipleAsClosed}
                    disabled={!multipleClosedDates?.length || savingMultiple}
                    className="w-full sm:w-auto bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 h-11"
                  >
                    {savingMultiple ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CalendarX2 className="w-4 h-4 mr-2" />}
                    Marcar como Fechado
                  </Button>
               </div>
            </div>

            {Object.keys(scheduleOverrides).length > 0 ? (
              <div className="space-y-3">
                <Label className="text-[#9B8FC0] text-sm font-semibold uppercase tracking-wider">Exceções Cadastradas</Label>
                <div className="grid gap-3">
                  {Object.entries(scheduleOverrides).sort((a,b) => a[0].localeCompare(b[0])).map(([dateKey, override]: readonly [string, any]) => {
                    const [year, month, day] = dateKey.split('-');
                    const formattedDate = `${day}/${month}/${year}`;
                    
                    return (
                      <div key={dateKey} className="flex items-center justify-between p-3 rounded-lg border border-[#2D214F] bg-[#0B0914]">
                        <div>
                          <p className="font-bold text-white">{formattedDate}</p>
                          <p className="text-sm text-[#9B8FC0]">
                            {override.isClosed 
                              ? <span className="text-red-400 font-medium">Dia Fechado</span>
                              : <span>Aberto das {override.start} às {override.end}</span>
                            }
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveOverride(dateKey)}
                          className="text-[#9B8FC0] hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
               <div className="text-center py-6 text-[#5B4F81] text-sm border border-[#2D214F] border-dashed rounded-xl bg-[#0B0914]">
                 Nenhuma exceção cadastrada.
               </div>
            )}
          </CardContent>
        </Card>

        {/* INTEGRATIONS SETTINGS */}
        <Card id="google-calendar" className="bg-[#130E20] border-[#2D214F] shadow-sm mt-8 scroll-mt-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-white">
               <CalendarIcon className="w-5 h-5 text-violet-400" />
               Integrações
            </CardTitle>
            <CardDescription className="text-[#9B8FC0]">
              Conecte sua conta do Google Calendar para sincronizar agendamentos.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#0B0914] rounded-xl border border-[#2D214F]">
               <div>
                  <h4 className="font-medium text-white mb-1">Google Calendar</h4>
                  <p className="text-sm text-[#5B4F81]">Agende e sincronize eventos automaticamente.</p>
               </div>
               <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                 {googleCalendarConnected && (
                   <Button
                     type="button"
                     variant="outline"
                     onClick={handleTestGoogleCalendar}
                     className="bg-transparent text-[#E2D9F3] border-[#2D214F] hover:bg-[#1A1333] hover:text-white transition-all font-medium shadow-sm"
                   >
                     Testar (F5)
                   </Button>
                 )}
                 <Button
                   type="button"
                   onClick={handleConnectGoogleCalendar}
                   disabled={googleCalendarConnected}
                   className={`${googleCalendarConnected ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-default' : 'bg-[#E2D9F3] text-[#0B0914] hover:bg-white'} transition-all font-semibold shadow-sm`}
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
          <Card className="bg-[#130E20] border-[#2D214F] overflow-hidden shadow-2xl">
            <div className="h-28 bg-[#8B5CF6]/20 relative">
               <div className="absolute inset-0 bg-[#0B0914]/40" />
            </div>
            <CardContent className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 border-4 border-[#130E20] bg-[#1A1333] -mt-12 mb-4 shadow-xl">
                <AvatarImage src={currentUser?.avatarUrl || ''} className="object-cover" />
                <AvatarFallback className="bg-[#1A1333] text-[#9B8FC0] text-2xl font-bold">
                  {watchedDisplayName?.charAt(0) || <User className="w-10 h-10" />}
                </AvatarFallback>
              </Avatar>
              
              <h3 className="text-xl font-bold text-white mb-1">{watchedDisplayName || 'Seu Nome Aqui'}</h3>
              <p className="text-sm font-medium text-violet-400 mb-4 bg-violet-400/10 px-3 py-1 rounded-full border border-violet-500/20 font-mono">
                syncou.app/{watchedSlug || 'seu-link'}
              </p>
              
              {watchedBio ? (
                <p className="text-sm text-[#E2D9F3] leading-relaxed max-w-[250px] whitespace-pre-wrap">
                  {watchedBio}
                </p>
              ) : (
                <div className="space-y-2 w-full mt-2 opacity-50">
                  <div className="h-2 w-full bg-[#2D214F] rounded mx-auto" />
                  <div className="h-2 w-5/6 bg-[#2D214F] rounded mx-auto" />
                  <div className="h-2 w-4/6 bg-[#2D214F] rounded mx-auto" />
                </div>
              )}
              
              <div className="mt-8 border-t border-[#2D214F] pt-6 w-full flex flex-col items-center justify-center space-y-4">
                 <div className="text-xs font-semibold text-[#5B4F81] uppercase tracking-widest">Prévia do Perfil</div>
                 <Button disabled variant="outline" className="w-full max-w-[200px] border-[#2D214F] bg-[#1A1333] text-[#9B8FC0]">
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
