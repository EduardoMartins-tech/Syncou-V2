import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Clock, DollarSign, Calendar as CalendarIcon, Edit2, Trash2, MessageSquare, TrendingUp, CheckCircle, RefreshCcw, Check, CheckCircle2, XCircle, Download, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useNotification } from '../hooks/useNotification';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { syncWithGoogleCalendar } from '../lib/calendar';
import { messaging } from '../lib/firebase';
import { getToken } from 'firebase/messaging';
import { googleSignInForCalendar } from '../lib/firebase';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  bufferTime: number;
  price: number;
  active: boolean;
  title?: string;
}

interface Appointment {
  id: string;
  clientName: string;
  clientWhatsApp: string;
  clientPhone?: string;
  services: string[];
  totalPrice: number;
  totalDuration: number;
  status: string;
  startAt: number;
  endAt: number;
  createdAt?: string;
  date?: string;
  time?: string;
  bookingSource: string;
  cancelReason?: string;
}

export function DashboardHome() {
  const { notifySuccess, notifyError, notifyLoading, dismiss, notifyInfo } = useNotification();
  const { currentUser, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  // removed googleAccessToken as this is a local build now, but keeping var for stub
  const googleAccessToken = null;
  const signInWithGoogle = () => {};

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isFetchingAppointments, setIsFetchingAppointments] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'agendamentos' | 'servicos' | 'analytics'>('agendamentos');

  // Status Filter ("Todos", "Pendente", "Confirmado", "Concluído", "Cancelado")
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [filterName, setFilterName] = useState<string>('');
  const [notificationPerm, setNotificationPerm] = useState<string>(Notification.permission);

  const registerFcmToken = async () => {
    try {
      console.log('Iniciando registerFcmToken...');
      const msg = await messaging();
      if (!msg) {
        console.warn('Firebase messaging indisponível');
        return;
      }
      
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not set');
        return;
      }

      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker não suportado neste navegador');
        return;
      }
      
      let registration: ServiceWorkerRegistration | undefined;
      try {
        registration = await navigator.serviceWorker.ready;
      } catch (err) {
        console.warn('Erro ao aguardar serviceWorker.ready:', err);
      }

      // Verifica se o Service Worker está ativo com sistema de retry de até 12 tentativas (6 segundos)
      let attempts = 0;
      const maxAttempts = 12;
      while (registration && (!registration.active || registration.active.state !== 'activated') && attempts < maxAttempts) {
        console.log(`[FCM] ServiceWorker ainda não ativo (tentativa ${attempts + 1}/${maxAttempts}). Estado:`, {
          installing: registration.installing ? registration.installing.state : null,
          waiting: registration.waiting ? registration.waiting.state : null,
          active: registration.active ? registration.active.state : null,
          controller: navigator.serviceWorker.controller ? 'presente' : 'ausente'
        });
        await new Promise((resolve) => setTimeout(resolve, 500));
        attempts++;

        const regs = await navigator.serviceWorker.getRegistrations();
        if (regs.length > 0) {
          registration = regs.find(r => r.active && r.active.state === 'activated') || regs[0];
        }
      }

      console.log('[FCM] Estado do SW antes do getToken():', {
        hasActive: !!registration?.active,
        activeState: registration?.active?.state,
        controller: navigator.serviceWorker.controller ? 'presente' : 'ausente'
      });

      console.log('Chamando getToken()...');
      const currentToken = await getToken(msg, { 
        vapidKey,
        serviceWorkerRegistration: registration 
      });
      console.log('Resultado do getToken:', currentToken ? 'Token obtido com sucesso' : 'Vazio/Nulo');
      
      if (currentToken) {
        // Send to backend
        const tokenStr = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(getAuthHeaders ? getAuthHeaders() : { 'Authorization': `Bearer ${tokenStr}` })
        };
        console.log('[FCM] Enviando FCM token para /api/user/fcm-token. Header auth:', headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : 'AUSENTE');
        const fcmRes = await fetch('/api/user/fcm-token', {
          method: 'POST',
          headers,
          body: JSON.stringify({ token: currentToken })
        });
        const fcmData = await fcmRes.json().catch(() => ({}));
        console.log('FCM token salvo no backend. Status:', fcmRes.status, 'Resposta:', fcmData);
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } catch (err) {
      console.error('An error occurred while retrieving token:', err);
    }
  };

  useEffect(() => {
    if (notificationPerm === 'granted') {
      registerFcmToken();
    }
  }, [notificationPerm]);

  useEffect(() => {
    const setupForegroundListener = async () => {
      const msg = await messaging();
      if (msg) {
        import('firebase/messaging').then(({ onMessage }) => {
          onMessage(msg, (payload) => {
            console.log('Foreground message received: ', payload);
            const title = payload.data?.title || payload.notification?.title || 'Notificação';
            const body = payload.data?.body || payload.notification?.body || '';
            toast.info(title, { description: body, duration: 6000 });
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(title, { body, icon: '/pwa-192x192.png' });
              } catch (e) {
                console.log('Erro ao disparar notificação nativa:', e);
              }
            }
          });
        });
      }
    };
    setupForegroundListener();
  }, []);


  // Cancel Modal
  const [cancelingApt, setCancelingApt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Reschedule Modal
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

  // Generic Confirm Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const appointmentsRef = useRef<Appointment[]>([]);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/services', { headers: getAuthHeaders() });
      if (res.ok) setServices(await res.json());
    } catch(err) {
      console.error(err);
    }
  };

  const fetchAppointments = async (isBackground = false) => {
    try {
      const res = await fetch('/api/appointments', { headers: getAuthHeaders() });
      if (res.ok) {
         const data = await res.json();
         if (isBackground && appointmentsRef.current.length > 0) {
            const existingIds = new Set(appointmentsRef.current.map(a => a.id));
            const newAppointments = data.filter((a: Appointment) => !existingIds.has(a.id));
            
            if (newAppointments.length > 0) {
              // Play sound
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(e => console.log('Audio error:', e));

              // Show native notification if allowed
              if (Notification.permission === 'granted') {
                newAppointments.forEach((apt: Appointment) => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(registration => {
                      registration.showNotification('Novo agendamento recebido!', {
                        body: `${apt.clientName} agendou um novo horário.`,
                        icon: '/pwa-192x192.png',
                        vibrate: [200, 100, 200]
                      } as any);
                    }).catch(err => {
                       new Notification('Novo agendamento recebido!', {
                         body: `${apt.clientName} agendou um novo horário.`,
                         icon: '/pwa-192x192.png'
                       });
                    });
                  } else {
                     new Notification('Novo agendamento recebido!', {
                       body: `${apt.clientName} agendou um novo horário.`,
                       icon: '/pwa-192x192.png'
                     });
                  }
                });
              } else {
                newAppointments.forEach((apt: Appointment) => {
                   notifySuccess(`Novo agendamento de ${apt.clientName}!`);
                });
              }
            }
         }
         setAppointments(data);
         appointmentsRef.current = data;
      }
    } catch(err) {
      console.error(err);
    } finally {
      if (!isBackground) setIsFetchingAppointments(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    setCurrentSlug(currentUser.slug);
    fetchServices();
    fetchAppointments();
    
    // Poll for new appointments
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 15000);
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAppointments(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  const handleSaveService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get('name') as string;
    const description = formData.get('description') as string;
    const duration = Number(formData.get('duration'));
    const bufferTime = Number(formData.get('bufferTime')) || 0;
    const price = Number(formData.get('price'));
    const active = formData.get('active') === 'on';

    try {
      if (editingService) {
        const res = await fetch(`/api/services/${editingService.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ title, description, duration, bufferTime, price, active })
        });
        if (res.ok) {
          notifySuccess('Serviço atualizado com sucesso!');
          fetchServices();
        } else {
          const resData = await res.json().catch(() => ({}));
          notifyError(resData.error || 'Erro ao atualizar serviço');
        }
      } else {
        const res = await fetch('/api/services', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ title, description, duration, bufferTime, price, active })
        });
        if (res.ok) {
          notifySuccess('Serviço criado com sucesso!');
          fetchServices();
        } else {
          const resData = await res.json().catch(() => ({}));
          notifyError(resData.error || 'Erro ao salvar serviço');
        }
      }
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error(err);
      notifyError('Erro ao salvar serviço');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Você tem certeza?')) return;
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setServices(services.filter(s => s.id !== id));
        notifySuccess('Serviço removido');
      }
    } catch(err) {
      notifyError('Erro ao remover');
    }
  }

  const handleUpdateAppointmentStatus = async (id: string, status: string) => {
    try {
       const res = await fetch(`/api/appointments/${id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ status })
       })
       if (!res.ok) throw new Error('Failed');
       
       notifySuccess('Status atualizado');
       fetchAppointments();
       
    } catch(err) {
       notifyError('Erro ao atualizar status');
    }
  }

  const getAptServicesText = (aptServices: string[]) => {
    if (!aptServices) return 'serviços selecionados';
    const matchedNames = aptServices
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean);
    return matchedNames.length > 0 ? matchedNames.join(', ') : 'serviços selecionados';
  };

  const openWhatsApp = (apt: Appointment) => {
    const rawNumber = apt.clientPhone || apt.clientWhatsApp || '';
    let digitsOnly = rawNumber.replace(/\D/g, '');
    if ((digitsOnly.length === 10 || digitsOnly.length === 11) && !digitsOnly.startsWith('55')) {
      digitsOnly = '55' + digitsOnly;
    }
    
    const servicesText = getAptServicesText(apt.services);
    const dateObj = new Date(apt.startAt || apt.date || '');
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    let message = `Olá ${apt.clientName}, tudo bem? Estou entrando em contato sobre o seu agendamento de ${servicesText} no dia ${formattedDate} às ${formattedTime}...`;
    if (currentUser?.whatsappMessageTemplate) {
       message = currentUser.whatsappMessageTemplate
          .replace(/{NOME}/g, apt.clientName)
          .replace(/{SERVICOS}/g, servicesText)
          .replace(/{DATA}/g, formattedDate)
          .replace(/{HORA}/g, formattedTime);
    }
    const url = `https://wa.me/${digitsOnly}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt || !rescheduleDate || !rescheduleTime) return;

    try {
      const startAtDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const startAtTime = startAtDate.getTime();
      const endAtTime = startAtTime + (reschedulingApt.totalDuration * 60000);

      const res = await fetch(`/api/appointments/${reschedulingApt.id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ 
            status: reschedulingApt.status, // Keep current status
            startAt: startAtTime, 
            endAt: endAtTime 
         })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao remarcar');
      }
      notifySuccess('Agendamento remarcado com sucesso!');
      fetchAppointments();
      setIsRescheduleModalOpen(false);
      setReschedulingApt(null);

    } catch (err: any) {
      console.error(err);
      notifyError(err.message || 'Erro ao remarcar o agendamento.');
    }
  };

  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelingApt) return;
    try {
      const res = await fetch(`/api/appointments/${cancelingApt.id}`, {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
           ...getAuthHeaders()
         },
         body: JSON.stringify({ status: 'Cancelado', cancelReason })
      })
      if (!res.ok) throw new Error('fail');
      notifySuccess('Agendamento cancelado com sucesso!');
      fetchAppointments();
      setIsCancelModalOpen(false);
      setCancelingApt(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
      notifyError('Erro ao cancelar o agendamento.');
    }
  };

  const handleSyncCalendar = async (isRetry = false) => {
    try {
      const loadingToast = notifyLoading(isRetry ? 'Re-sincronizando...' : 'Sincronizando com o Google Calendar...');
      const res = await fetch('/api/appointments/sync-all', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      dismiss(loadingToast);
      
      const data = await res.json();
      if (res.ok) {
        if (data.synced > 0) {
          notifySuccess(`✅ ${data.synced} agendamento(s) sincronizado(s) com sucesso na sua agenda do Google!`);
        } else if (data.errors > 0) {
          console.error("GCal Sync Error:", data.lastError);
          const isAuthError = String(data.lastError).includes('Invalid Credentials') || String(data.lastError).includes('401') || String(data.lastError).includes('UNAUTHENTICATED');
          if (isAuthError && !isRetry) {
             notifyInfo("Acesso ao Google expirou. Reconectando...");
             try {
                const result = await googleSignInForCalendar();
                if (result?.accessToken) {
                   await fetch('/api/users/google-token', {
                     method: 'POST',
                     headers: {
                       ...getAuthHeaders(),
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ token: result.accessToken }),
                   });
                   // Retry the sync automatically
                   handleSyncCalendar(true);
                }
             } catch(signInErr: any) {
                if (signInErr.code !== 'auth/popup-closed-by-user') {
                   notifyError("Falha ao reconectar. Por favor, tente novamente na aba Minha Página.");
                }
             }
          } else if (isAuthError && isRetry) {
             notifyError(`❌ O acesso ao Google ainda é falho. Verifique suas permissões no Google.`);
          } else {
             notifyError(`❌ Tentativa concluída, mas falhou em ${data.errors} agendamento(s). Erro: ${data.lastError ? String(data.lastError).substring(0, 80) : "Desconhecido"}.`, { duration: 8000 });
          }
        } else {
          notifyInfo('Tudo atualizado! Nenhum agendamento pendente para sincronização.');
        }
      } else {
        notifyError(data.error || 'Erro ao sincronizar. Tente reconectar sua conta.');
      }
    } catch(err) {
      notifyError('Erro interno de conexão. Tente novamente mais tarde.');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Determine standard status string
    let aptStatus = 'Pendente';
    if (apt.status === 'confirmed' || apt.status === 'Confirmado') aptStatus = 'Confirmado';
    else if (apt.status === 'completed' || apt.status === 'Concluído') aptStatus = 'Concluído';
    else if (apt.status === 'cancelled' || apt.status === 'Cancelado') aptStatus = 'Cancelado';

    // Status filter
    if (filterStatus !== 'Todos' && aptStatus !== filterStatus) return false;

    // Filter by name (clientName)
    if (filterName && !apt.clientName.toLowerCase().includes(filterName.toLowerCase())) return false;

    return true;
  }).sort((a, b) => {
    const isAPending = a.status === 'scheduled' || a.status === 'Pendente' || !a.status;
    const isBPending = b.status === 'scheduled' || b.status === 'Pendente' || !b.status;
    
    if (isAPending && !isBPending) return -1;
    if (!isAPending && isBPending) return 1;

    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.startAt;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.startAt;
    return bTime - aTime;
  });

  const statusCounts = appointments.reduce((acc, apt) => {
    let s = 'Pendente';
    if (apt.status === 'confirmed' || apt.status === 'Confirmado') s = 'Confirmado';
    else if (apt.status === 'completed' || apt.status === 'Concluído') s = 'Concluído';
    else if (apt.status === 'cancelled' || apt.status === 'Cancelado') s = 'Cancelado';
    acc[s] = (acc[s] || 0) + 1;
    acc['Todos'] = (acc['Todos'] || 0) + 1;
    return acc;
  }, { 'Todos': 0, 'Pendente': 0, 'Confirmado': 0, 'Concluído': 0, 'Cancelado': 0 } as Record<string, number>);

  const now = new Date();
  const currentMonthRevenue = appointments
    .filter(a => {
       const isConfirmed = a.status === 'confirmed' || a.status === 'Confirmado';
       if (!isConfirmed) return false;
       const dateObj = new Date(a.startAt || a.date || '');
       return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    })
    .reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);

  const getWeeklyData = () => {
    const data = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '');
      
      const count = appointments.filter(a => {
        if (a.status === 'cancelled' || a.status === 'Cancelado') return false;
        const aptDate = new Date(a.startAt || a.date || '');
        return aptDate.getDate() === date.getDate() && aptDate.getMonth() === date.getMonth() && aptDate.getFullYear() === date.getFullYear();
      }).length;
      
      data.push({ name: dateString, appointments: count });
    }
    return data;
  };

  const exportToCSV = () => {
    // Columns: Nome do Cliente, Data, Hora, Serviço, Valor
    const headers = ['Nome do Cliente', 'Data', 'Hora', 'Serviço', 'Valor'];
    const rows = filteredAppointments.map(apt => {
      // Handle missing fields safely
      const name = apt.clientName || 'N/A';
      
      let date = 'N/A';
      let time = 'N/A';
      if (apt.startAt) {
        const d = new Date(apt.startAt);
        date = d.toLocaleDateString('pt-BR');
        time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (apt.date && apt.time) {
        date = new Date(apt.date).toLocaleDateString('pt-BR');
        time = apt.time;
      }
      
      const service = (apt.services && apt.services.length > 0) ? apt.services.join('; ') : 'N/A';
      const price = (Number(apt.totalPrice) || 0).toFixed(2);
      
      // Escape commas by quoting
      return [
        `"${name.replace(/"/g, '""')}"`,
        `"${date}"`,
        `"${time}"`,
        `"${service.replace(/"/g, '""')}"`,
        `"${price}"`
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agendamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notifySuccess('Arquivo CSV exportado com sucesso!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      {!currentUser?.googleAccessToken && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#130E20] border border-[#2D214F] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-lg"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="relative p-3 bg-[#0B0914] border border-[#2D214F] rounded-xl text-[#9B8FC0] flex-shrink-0">
              <CalendarIcon className="w-6 h-6" />
              {/* Nó pulsante âmbar indicando desconexão/ação necessária */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5A623] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#F5A623] border-2 border-[#130E20]"></span>
              </span>
            </div>
            <div>
              <h3 className="text-white font-semibold font-outfit text-lg">Conecte sua Órbita</h3>
              <p className="text-[#9B8FC0] text-sm mt-0.5">Vincule sua conta do Google Calendar para ativar a sincronização bidirecional automática.</p>
            </div>
          </div>
          <Button onClick={() => navigate('/dashboard/settings#google-calendar')} className="w-full sm:w-auto bg-[#F5A623] hover:bg-[#E09612] text-[#0A0713] font-semibold h-11 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(245,166,35,0.15)]">
            Conectar Agenda
          </Button>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-[#9B8FC0]">Acompanhe seus agendamentos e gerencie seus serviços.</p>
        </div>
        <div className="flex flex-row flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto justify-end">
          {currentSlug && (
             <Button className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-lg shadow-violet-500/20" onClick={() => window.open(`/p/${currentSlug}`, '_blank')}>
               <Plus className="w-4 h-4 mr-2" />
               Agendar Agora
             </Button>
          )}
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none w-full sm:w-auto bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white px-2 sm:px-4" onClick={() => handleSyncCalendar(false)} title="Sincroniza seus agendamentos para o seu Google Calendar. Útil caso algum agendamento tenha falhado.">
              <RefreshCcw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sincronizar</span>
              <span className="sm:hidden ml-1">Sincronizar</span>
            </Button>
            {currentSlug && (
               <Button variant="outline" className="flex-1 sm:flex-none w-full sm:w-auto bg-[#130E20] border-[#2D214F] text-[#E2D9F3] hover:bg-[#1A1333] hover:text-white px-2 sm:px-4" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/p/${currentSlug}`);
                  notifySuccess("Link copiado!");
               }}>
                 <ExternalLink className="w-4 h-4 sm:mr-2" />
                 <span className="hidden sm:inline">Copiar</span>
                 <span className="sm:hidden ml-1">Copiar</span>
               </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs Switcher */}
      <div className="flex space-x-2 rounded-xl bg-[#130E20] p-1 border border-[#2D214F] w-full lg:w-fit mb-6 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('agendamentos')}
          className={`flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'agendamentos' ? 'bg-[#2D214F] text-white shadow' : 'text-[#9B8FC0] hover:bg-[#1A1333] hover:text-white'}`}
        >
          <CalendarIcon className="w-4 h-4 inline-block mr-2 mb-0.5" />
          Agendamentos
        </button>
        <button 
          onClick={() => setActiveTab('servicos')}
          className={`flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'servicos' ? 'bg-[#2D214F] text-white shadow' : 'text-[#9B8FC0] hover:bg-[#1A1333] hover:text-white'}`}
        >
          <span className="w-4 h-4 inline-flex items-center justify-center rounded-sm bg-[#8B5CF6]/20 text-violet-400 text-[10px] font-bold mr-2 mb-0.5">S</span>
          Serviços
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 rounded-lg py-2.5 px-3 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'analytics' ? 'bg-[#2D214F] text-white shadow' : 'text-[#9B8FC0] hover:bg-[#1A1333] hover:text-white'}`}
        >
          <TrendingUp className="w-4 h-4 inline-block mr-2 mb-0.5" />
          Analytics
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-in fade-in duration-300 slide-in-from-bottom-2">
      {/* Weekly Activity Chart */}
      {!isFetchingAppointments && (
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
           className="bg-[#130E20] border border-[#2D214F] rounded-2xl p-6 shadow-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Atividade Semanal</h3>
            <p className="text-sm text-[#9B8FC0]">Agendamentos confirmados/pendentes (últimos 7 dias)</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getWeeklyData()} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2D214F" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#5B4F81" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10}
                />
                <YAxis 
                  stroke="#5B4F81" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#2D214F', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#1A1333', border: '1px solid #2D214F', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#8B5CF6', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey="appointments" 
                  name="Agendamentos"
                  fill="#8B5CF6" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isFetchingAppointments ? (
          <>
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
            <div className="bg-[#130E20] rounded-2xl h-32 animate-pulse border border-[#2D214F]" />
          </>
        ) : (
          <>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Faturamento (Mês)</h3>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                <span className="text-lg font-medium text-[#9B8FC0]">R$</span>
                {currentMonthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Total de Agendamentos</h3>
                <TrendingUp className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div className="text-4xl font-bold text-white">{appointments.length}</div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Pendentes</h3>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'scheduled' || a.status === 'Pendente' || !a.status).length}
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Confirmados</h3>
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'confirmed' || a.status === 'Confirmado').length}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#130E20] p-6 rounded-2xl border border-[#2D214F] hover:border-[#4B3B7A] transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-[#9B8FC0]">Concluídos</h3>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-4xl font-bold text-white">
                {appointments.filter(a => a.status === 'completed' || a.status === 'Concluído').length}
              </div>
            </motion.div>
          </>
        )}
      </div>
      </div>
      )}

      {activeTab === 'agendamentos' && (
        <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-bottom-2 w-full lg:max-w-4xl">
        {/* Appointments Section */}
           <div className="flex flex-col gap-4">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <CalendarIcon className="w-5 h-5 text-violet-400" />
                 Agendamentos
                 <span className="bg-[#1A1333] text-[#E2D9F3] text-xs px-2 py-1 rounded-full">{filteredAppointments.length}</span>
               </h2>
               
               <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                 {notificationPerm !== 'granted' && (
                   <Button 
                     onClick={async () => {
                       console.log('Valor atual de Notification.permission antes do clique:', Notification.permission);
                       if (!('Notification' in window)) {
                         notifyError('Navegador não suporta notificações.');
                         return;
                       }
                       if (Notification.permission === 'denied') {
                         notifyError('Notificações bloqueadas. Libere nas permissões do site/navegador para receber alertas.');
                         return;
                       }
                       const p = await Notification.requestPermission();
                       console.log('Valor de Notification.permission após request:', p);
                       setNotificationPerm(p);
                       if (p === 'granted') notifySuccess('Notificações ativadas! (Nota: isso apenas mostra que a permissão foi dada no browser)');
                     }} 
                     variant="outline" 
                     className="border-amber-500/50 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 h-9 px-3 shrink-0"
                   >
                     <Bell className="w-4 h-4 mr-2" />
                     <span>Ativar Notificações</span>
                   </Button>
                 )}
                 <Input 
                   placeholder="Filtrar por nome..." 
                   value={filterName}
                   onChange={e => setFilterName(e.target.value)}
                   className="bg-[#130E20] border-[#2D214F] text-white h-9 placeholder:text-[#5B4F81] focus-visible:ring-violet-500 w-[150px] sm:w-[200px]"
                 />
                 <Button onClick={exportToCSV} variant="outline" className="border-[#2D214F] text-[#E2D9F3] hover:text-white hover:bg-[#2D214F]/50 h-9 px-3 shrink-0">
                   <Download className="w-4 h-4 sm:mr-2" />
                   <span className="hidden sm:inline">Exportar CSV</span>
                 </Button>
               </div>
             </div>
             
             {/* Tabs para Filtro */}
             <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2 snap-x">
               {['Todos', 'Pendente', 'Confirmado', 'Concluído', 'Cancelado'].map(status => (
                 <button
                   key={status}
                   onClick={() => setFilterStatus(status)}
                   className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 snap-start ${
                     filterStatus === status 
                       ? 'bg-[#2D214F] text-white shadow-sm border border-[#4B3B7A]' 
                       : 'bg-[#130E20] border border-[#2D214F] text-[#9B8FC0] hover:text-white hover:border-[#4B3B7A]'
                   }`}
                 >
                   {status === 'Pendente' ? 'Pendentes' : status === 'Confirmado' ? 'Confirmados' : status === 'Cancelado' ? 'Cancelados' : status === 'Concluído' ? 'Concluídos' : 'Todos'}
                   <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                     filterStatus === status
                       ? 'bg-white/20 text-white'
                       : 'bg-[#2D214F] text-[#E2D9F3]'
                   }`}>
                     {statusCounts[status] || 0}
                   </span>
                 </button>
               ))}
             </div>
           </div>

           <div className="space-y-4">
              {isFetchingAppointments ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-[#130E20] border-[#2D214F] shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-2">
                             <div className="h-6 w-32 bg-[#1A1333] rounded animate-pulse" />
                             <div className="h-4 w-24 bg-[#1A1333] rounded animate-pulse" />
                          </div>
                          <div className="h-6 w-20 bg-[#1A1333] rounded-full animate-pulse" />
                        </div>
                        <div className="bg-[#0B0914] rounded-lg p-3 flex justify-between items-center mb-4 border border-[#2D214F]">
                           <div className="h-4 w-32 bg-[#1A1333] rounded animate-pulse" />
                           <div className="h-4 w-16 bg-[#1A1333] rounded animate-pulse" />
                        </div>
                        <div className="flex flex-col gap-2 mt-4">
                          <div className="h-9 w-full bg-[#1A1333] rounded animate-pulse" />
                          <div className="flex gap-2">
                            <div className="h-9 flex-1 bg-[#1A1333] rounded animate-pulse" />
                            <div className="h-9 flex-1 bg-[#1A1333] rounded animate-pulse" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : filteredAppointments.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-[#2D214F] rounded-xl bg-[#130E20]">
                   <p className="text-[#9B8FC0]">Nenhum agendamento encontrado.</p>
                   {filterName || filterStatus !== 'Todos' ? (
                     <Button variant="link" onClick={() => { setFilterName(''); setFilterStatus('Todos'); }} className="text-violet-400 mt-2">
                       Limpar filtros
                     </Button>
                   ) : (
                     <p className="text-sm text-[#5B4F81] mt-2">Compartilhe seu link para receber clientes.</p>
                   )}
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredAppointments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.4, delay: 0.1 + (index * 0.05), ease: [0.16, 1, 0.3, 1] }}
                    layout
                  >
                    <Card className="bg-[#130E20] border-[#2D214F] shadow-sm hover:border-violet-500/30 transition-all overflow-hidden group">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row p-4 gap-4 items-start md:items-stretch">
                        
                        {/* Coluna 1: Data e Hora */}
                        <div className="flex-shrink-0 md:w-32 md:border-r border-[#2D214F] md:pr-4 flex flex-row md:flex-col items-center md:items-start md:justify-center gap-3 md:gap-0">
                          <div className="font-outfit font-bold text-2xl text-white">
                             {new Date(apt.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-xs text-[#9B8FC0] mt-0.5 font-medium">
                             {new Date(apt.startAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </div>
                        </div>

                        {/* Coluna 2: Informações do Cliente */}
                        <div className="flex-1 min-w-0 md:py-1">
                           <div className="flex items-center gap-2">
                             <h3 className="font-bold text-white text-lg truncate">{apt.clientName}</h3>
                             {apt.bookingSource === 'public_link' && (
                               <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">via syncou</span>
                             )}
                           </div>
                           <div className="flex items-center gap-3 text-sm text-[#9B8FC0] mt-2">
                             <button onClick={() => openWhatsApp(apt)} className="text-[#25D366] hover:text-[#128C7E] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 px-2 py-1 rounded transition-colors inline-flex items-center gap-1.5 focus:outline-none font-medium">
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                                 <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                               </svg>
                               {apt.clientWhatsApp || apt.clientPhone || 'Sem número'}
                             </button>
                             <span className="font-mono text-violet-300 bg-violet-500/5 px-2 py-1 rounded">
                               R$ {apt.totalPrice?.toFixed(2) || '0.00'}
                             </span>
                           </div>
                        </div>

                        {/* Coluna 3: Status e Ações */}
                        <div className="flex flex-col items-end gap-3 flex-shrink-0 w-full md:w-auto mt-4 md:mt-0 border-t border-[#2D214F] pt-4 md:border-t-0 md:pt-0">
                          <div className={`text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1.5 w-fit
                            ${(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 
                              (apt.status === 'confirmed' || apt.status === 'Confirmado') ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20' : 
                              (apt.status === 'completed' || apt.status === 'Concluído') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'}
                          `}>
                            {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && <><Clock className="w-3.5 h-3.5" /> Pendente</>}
                            {(apt.status === 'confirmed' || apt.status === 'Confirmado') && <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmado</>}
                            {(apt.status === 'completed' || apt.status === 'Concluído') && <><CheckCircle2 className="w-3.5 h-3.5" /> Concluído</>}
                            {(apt.status === 'cancelled' || apt.status === 'Cancelado') && <><XCircle className="w-3.5 h-3.5" /> Cancelado</>}
                          </div>
                          
                          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 justify-end w-full">
                            {(apt.status !== 'cancelled' && apt.status !== 'Cancelado' && apt.status !== 'completed' && apt.status !== 'Concluído') && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  setReschedulingApt(apt);
                                  const currentStart = new Date(apt.startAt);
                                  setRescheduleDate(currentStart.toISOString().split('T')[0]);
                                  setRescheduleTime(currentStart.toTimeString().slice(0, 5));
                                  setIsRescheduleModalOpen(true);
                                }} 
                                className="h-8 px-2 text-[#9B8FC0] hover:text-white hover:bg-white/5"
                              >
                                <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Remarcar
                              </Button>
                            )}

                            {(apt.status === 'scheduled' || apt.status === 'Pendente' || !apt.status) && (
                               <>
                                 <Button size="sm" onClick={() => handleUpdateAppointmentStatus(apt.id, 'Confirmado')} className="h-8 px-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium rounded-md">
                                   Confirmar
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   onClick={() => {
                                     setCancelingApt(apt);
                                     setCancelReason('');
                                     setIsCancelModalOpen(true);
                                   }} 
                                   variant="ghost" 
                                   className="h-8 px-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
                                 >
                                   Cancelar
                                 </Button>
                               </>
                            )}

                            {(apt.status === 'confirmed' || apt.status === 'Confirmado') && (
                               <>
                                 <Button 
                                   size="sm" 
                                   onClick={() => {
                                     setConfirmModal({
                                       isOpen: true,
                                       title: 'Concluir Serviço',
                                       description: 'Tem certeza que deseja marcar este serviço como concluído?',
                                       confirmText: 'Sim, Concluir',
                                       onConfirm: () => handleUpdateAppointmentStatus(apt.id, 'Concluído')
                                     });
                                   }}
                                   className="h-8 px-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 border-none font-medium"
                                 >
                                   <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                   Concluir
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   onClick={() => {
                                     setCancelingApt(apt);
                                     setCancelReason('');
                                     setIsCancelModalOpen(true);
                                   }}
                                   variant="ghost" 
                                   className="h-8 px-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
                                 >
                                   Cancelar
                                 </Button>
                                 <Button 
                                   size="sm" 
                                   onClick={() => {
                                     setConfirmModal({
                                       isOpen: true,
                                       title: 'Desfazer Confirmação',
                                       description: 'Tem certeza que deseja desfazer a confirmação e voltar este agendamento para Pendente?',
                                       confirmText: 'Sim, Desfazer',
                                       onConfirm: () => handleUpdateAppointmentStatus(apt.id, 'Pendente')
                                     });
                                   }}
                                   variant="ghost" 
                                   className="h-8 w-8 p-0 text-[#9B8FC0] hover:text-white hover:bg-white/5"
                                   title="Voltar para Pendente"
                                 >
                                   <RefreshCcw className="w-3.5 h-3.5" />
                                 </Button>
                               </>
                            )}

                            {(apt.status === 'completed' || apt.status === 'Concluído') && (
                               <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">
                                 Serviço Concluído
                               </span>
                            )}

                            {(apt.status === 'cancelled' || apt.status === 'Cancelado') && (
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                  Cancelado
                                </span>
                                {apt.cancelReason && (
                                  <p className="text-[10px] text-slate-400 italic bg-[#0A0713] px-2 py-1 rounded border border-[#2D214F]">
                                    Motivo: {apt.cancelReason}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    </Card>
                  </motion.div>
                ))}
                </AnimatePresence>
              )}
           </div>
        </div>
      )}

      {activeTab === 'servicos' && (
        <div className="space-y-6 animate-in fade-in duration-300 slide-in-from-bottom-2 w-full lg:max-w-4xl">
        {/* Services Section */}
           <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="w-6 h-6 rounded-md bg-[#8B5CF6]/20 text-violet-400 flex items-center justify-center text-xs font-semibold ring-1 ring-violet-500/30">S</span>
               Meus Serviços
             </h2>
             <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
               <DialogTrigger asChild>
                 <Button onClick={() => setEditingService(null)} size="sm" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">
                   <Plus className="w-4 h-4 mr-1" /> Novo
                 </Button>
               </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3] shadow-2xl">
                <form onSubmit={handleSaveService} className="flex flex-col">
                  <DialogHeader className="flex flex-row items-center justify-between pr-8 pb-4">
                    <DialogTitle className="text-white text-xl">{editingService ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
                    <div className="flex items-center gap-2 mt-0">
                      <Label htmlFor="active" className="text-sm font-medium text-white cursor-pointer">Ativo</Label>
                      <Switch id="active" name="active" defaultChecked={editingService ? editingService.active !== false : true} />
                    </div>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-[#9B8FC0]">Nome do Serviço</Label>
                      <Input id="name" name="name" defaultValue={editingService?.title || editingService?.name} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" placeholder="Ex: Corte de Cabelo" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="price" className="text-[#9B8FC0]">Preço (R$)</Label>
                        <Input id="price" name="price" type="number" min="0" step="0.01" defaultValue={editingService?.price} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11 text-lg font-medium" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-[#9B8FC0]">Duração (min)</Label>
                        <Input id="duration" name="duration" type="number" min="1" defaultValue={editingService?.duration} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bufferTime" className="text-[#9B8FC0]">Respiro (min)</Label>
                        <Input id="bufferTime" name="bufferTime" type="number" min="0" defaultValue={editingService?.bufferTime || 0} required className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 h-11" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-[#9B8FC0]">Descrição (Opcional)</Label>
                      <textarea id="description" name="description" defaultValue={editingService?.description} className="flex min-h-[80px] w-full rounded-md bg-[#0B0914] border border-[#2D214F] px-3 py-2 text-sm text-white placeholder:text-[#9B8FC0]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none" placeholder="Ex: Lavagem e finalização inclusos" />
                    </div>
                    <DialogFooter className="pt-4 border-t border-[#2D214F] mt-2">
                      <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]/50">Cancelar</Button>
                      <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white">Salvar Serviço</Button>
                    </DialogFooter>
                  </div>
                </form>
              </DialogContent>
             </Dialog>
           </div>

           <div className="grid gap-4">
             {services.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-[#2D214F] rounded-xl bg-[#130E20]">
                   <p className="text-[#9B8FC0]">Nenhum serviço cadastrado.</p>
                </div>
             ) : (
                services.map(service => (
                  <Card key={service.id} className={`transition-all shadow-sm overflow-hidden group ${service.active !== false ? 'bg-[#130E20] border-[#2D214F] hover:border-violet-500/30' : 'bg-[#0B0914] border-[#1A1333] opacity-75 grayscale-[30%]'}`}>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-2">
                          {service.active !== false ? (
                            <span className="relative flex h-2 w-2 flex-shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          ) : (
                            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-slate-600"></span>
                          )}
                          <h4 className={`font-bold text-lg truncate ${service.active !== false ? 'text-white' : 'text-slate-400'}`}>{service.title || service.name}</h4>
                          {service.active === false && <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-800/50 px-1.5 py-0.5 rounded">Inativo</span>}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                           <span className={`flex items-center px-2 py-1 rounded ${service.active !== false ? 'bg-[#2D214F]/40 text-[#9B8FC0]' : 'bg-white/5 text-slate-500'}`}>
                             <Clock className="w-3 h-3 mr-1" /> {service.duration}m
                           </span>
                           {(service.bufferTime && service.bufferTime > 0) ? (
                             <span className={`flex items-center px-2 py-1 rounded ${service.active !== false ? 'bg-amber-500/10 text-amber-500/80' : 'bg-white/5 text-slate-500'}`}>
                               + {service.bufferTime}m respiro
                             </span>
                           ) : null}
                           <span className={`flex items-center font-medium px-2 py-1 rounded ${service.active !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                             R$ {service.price?.toFixed(2)}
                           </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t border-[#2D214F] sm:border-0 pt-3 sm:pt-0">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-[#9B8FC0] hover:text-white hover:bg-white/5" onClick={() => { setEditingService(service); setIsServiceModalOpen(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400/80 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteService(service.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
             )}
           </div>
        </div>
      )}

      {/* Generic Confirm Modal */}
      <Dialog open={confirmModal.isOpen} onOpenChange={(open) => !open && setConfirmModal(prev => ({ ...prev, isOpen: false }))}>
        <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{confirmModal.title}</DialogTitle>
            <CardDescription className="text-[#9B8FC0]">
              {confirmModal.description}
            </CardDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex sm:justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
              }} 
              className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            >
              {confirmModal.confirmText || 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancellation Reason Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-[#E2D9F3]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse ring-4 ring-red-500/20" />
              Cancelar Agendamento
            </DialogTitle>
            <CardDescription className="text-[#9B8FC0]">
              Por favor, informe a justificativa do cancelamento de {cancelingApt ? <b className="text-white">{cancelingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason" className="text-[#9B8FC0]">Justificativa / Motivo</Label>
              <textarea
                id="cancelReason"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Exemplo: Fora do horário de disponibilidade, imprevisto de força maior, etc."
                className="w-full h-24 bg-[#0B0914] border border-[#2D214F] rounded-lg p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-[#5B4F81]"
              />
            </div>
            <DialogFooter className="pt-2 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsCancelModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
                Voltar
              </Button>
              <Button type="submit" variant="destructive" className="bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold border-none">
                Confirmar Cancelamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#130E20] border-[#2D214F] text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-violet-400" />
              Remarcar Agendamento
            </DialogTitle>
            <CardDescription className="text-[#9B8FC0]">
              Escolha a nova data e horário para o agendamento de {reschedulingApt ? <b className="text-white">{reschedulingApt.clientName}</b> : 'agendamento'}.
            </CardDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReschedule} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rescheduleDate" className="text-[#9B8FC0]">Nova Data</Label>
                <Input
                  id="rescheduleDate"
                  type="date"
                  required
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rescheduleTime" className="text-[#9B8FC0]">Novo Horário</Label>
                <Input
                  id="rescheduleTime"
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="bg-[#0B0914] border-[#2D214F] text-white focus-visible:ring-violet-500 block [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-11"
                />
              </div>
            </div>
            
            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsRescheduleModalOpen(false)} className="text-[#9B8FC0] hover:text-white hover:bg-[#2D214F]">
                Cancelar
              </Button>
              <Button type="submit" className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold">
                Confirmar Remarcação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
