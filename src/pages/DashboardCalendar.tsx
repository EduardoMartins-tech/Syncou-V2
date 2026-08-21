import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messagesConfig = {
  allDay: 'Dia todo',
  previous: 'Anterior',
  next: 'Próximo',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Não há agendamentos neste período.',
  showMore: (total: number) => `+ mais ${total}`
};

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => {
    toolbar.onNavigate('PREV');
  };

  const goToNext = () => {
    toolbar.onNavigate('NEXT');
  };

  const goToCurrent = () => {
    toolbar.onNavigate('TODAY');
  };

  const label = () => {
    const date = format(toolbar.date, 'MMMM yyyy', { locale: ptBR });
    return <span className="text-lg font-semibold text-white capitalize">{date}</span>;
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={goToCurrent}
          className="px-4 py-2 text-sm font-medium rounded-md bg-[#1A1333] hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
        >
          Hoje
        </button>
        <div className="flex items-center bg-[#1A1333] rounded-md overflow-hidden">
          <button
            onClick={goToBack}
            className="p-2 hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="p-2 hover:bg-[#2D214F] text-[#E2D9F3] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        {label()}
      </div>
      <div className="flex items-center gap-1 bg-[#1A1333] p-1 rounded-lg">
        {['month', 'week', 'day', 'agenda'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              toolbar.view === viewName
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-[#9B8FC0] hover:text-[#E2D9F3] hover:bg-[#2D214F]'
            }`}
          >
            {messagesConfig[viewName as keyof typeof messagesConfig] as string}
          </button>
        ))}
      </div>
    </div>
  );
};

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
  bookingSource: string;
  cancelReason?: string;
}

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

const CustomAgendaEvent = ({ event }: any) => {
  const isConfirmed = event.isConfirmed;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConfirmed ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
      <span className="font-medium text-[#e8eaed]">{event.title}</span>
    </div>
  );
};

export function DashboardCalendar() {
  const { getAuthHeaders } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [view, setView] = useState<View>(Views.WEEK);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [aptRes, srvRes] = await Promise.all([
          fetch('/api/appointments', { headers: getAuthHeaders() }),
          fetch('/api/services', { headers: getAuthHeaders() })
        ]);
        
        if (aptRes.ok) setAppointments(await aptRes.json());
        if (srvRes.ok) setServices(await srvRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetching(false);
      }
    };
    fetchAll();
  }, []);

  const getAptServicesText = (aptServices: string[]) => {
    if (!aptServices || !Array.isArray(aptServices)) return 'serviços selecionados';
    const matchedNames = aptServices
      .map(id => services.find(s => s.id === id)?.name || services.find(s => s.id === id)?.title)
      .filter(Boolean);
    return matchedNames.length > 0 ? matchedNames.join(', ') : 'serviços selecionados';
  };

  const events = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'Confirmado' || a.status === 'Pendente' || a.status === 'scheduled' || !a.status)
    .map(apt => {
      const isConfirmed = apt.status === 'confirmed' || apt.status === 'Confirmado';
      return {
        id: apt.id,
        title: `${apt.clientName} - ${getAptServicesText(apt.services)}`,
        start: new Date(apt.startAt),
        end: new Date(apt.endAt || apt.startAt + apt.totalDuration * 60000),
        resource: apt,
        isConfirmed
      };
    });

  const eventStyleGetter = (event: any) => {
    const backgroundColor = event.isConfirmed ? '#10B981' : '#F59E0B';
    const style = {
      backgroundColor: backgroundColor,
      borderRadius: '5px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      padding: '2px 5px',
      fontSize: '0.8rem',
      fontWeight: '500'
    };
    return {
      style
    };
  };

  const handleSelectEvent = (event: any) => {
     // Could open a modal to show details, for now just expanding the existing DashboardHome interaction, or simple alert
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-between items-end gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Calendário</h1>
          <p className="text-[#9B8FC0]">Visualize e gerencie todos os seus agendamentos.</p>
        </div>
      </motion.div>

      <Card className="bg-[#130E20] border-[#2D214F] shadow-sm overflow-visible">
        <CardContent className="p-6">
          <style dangerouslySetInnerHTML={{__html: `
            .rbc-calendar {
              min-height: 700px;
              color: #e8eaed;
              font-family: inherit;
              border: none;
            }
            .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
              border: none;
              background: transparent;
            }
            
            /* Headers */
            .rbc-header {
              padding: 12px 4px;
              border-bottom: none;
              background-color: transparent;
              color: #9aa0a6;
              font-weight: 500;
              font-size: 0.8rem;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: center;
              border-left: none !important;
            }
            .rbc-header.rbc-today {
              color: #E2D9F3;
              background: transparent;
            }
            .rbc-header.rbc-today > span {
              display: inline-block;
              background: #8B5CF6;
              color: white;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              line-height: 32px;
              text-align: center;
              margin-top: 4px;
            }

            /* Month Grid Lines & Borders */
            .rbc-month-row {
              border-top: 1px solid rgba(255,255,255,0.08);
            }
            .rbc-day-bg {
              border-left: 1px solid rgba(255,255,255,0.08);
            }
            .rbc-day-bg:first-child {
              border-left: none;
            }

            /* Week/Day Grid Lines */
            .rbc-time-content {
              border-top: none;
            }
            .rbc-time-header-content {
              border-left: 1px solid rgba(255,255,255,0.08);
            }
            .rbc-time-content > * + * > * {
              border-left: 1px solid rgba(255,255,255,0.08);
            }
            .rbc-timeslot-group {
              border-bottom: 1px solid rgba(255,255,255,0.08);
              min-height: 60px;
            }
            .rbc-time-slot {
              border-top: none;
            }

            /* Today & Other states */
            .rbc-today {
              background-color: transparent;
            }
            .rbc-off-range-bg {
              background-color: transparent;
            }

            /* Day/Week Gutter */
            .rbc-time-gutter {
              background-color: transparent;
            }
            .rbc-time-gutter .rbc-timeslot-group {
              border-bottom: none;
            }
            .rbc-time-gutter .rbc-time-slot {
              color: #9aa0a6;
              font-size: 0.75rem;
              padding-right: 12px;
              display: flex;
              align-items: flex-start;
              justify-content: flex-end;
              border: none;
              transform: translateY(-8px);
            }
            .rbc-allday-cell {
              display: none;
            }

            /* Events */
            .rbc-event {
              padding: 4px 8px;
              border-radius: 4px;
              box-shadow: none !important;
              border: none !important;
              transition: filter 0.2s;
              margin-bottom: 2px;
            }
            .rbc-event:hover {
              filter: brightness(1.2);
              z-index: 10 !important;
            }
            .rbc-event.rbc-selected {
              filter: brightness(1.3);
            }
            .rbc-event-content {
              font-size: 0.8rem;
              font-weight: 500;
              line-height: 1.2;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            /* Month View Event Fix */
            .rbc-month-view .rbc-event {
              border-radius: 4px;
              padding: 2px 6px;
            }

            /* Event Labels in Month View */
            .rbc-date-cell {
              padding: 8px;
              text-align: center;
              font-size: 0.85rem;
              color: #e8eaed;
              font-weight: 400;
            }
            .rbc-date-cell.rbc-now {
              font-weight: bold;
            }
            .rbc-date-cell.rbc-now > a {
              display: inline-block;
              background-color: #8B5CF6;
              color: white;
              width: 28px;
              height: 28px;
              line-height: 28px;
              border-radius: 50%;
            }
            .rbc-date-cell.rbc-off-range {
              color: #5f6368;
            }

            /* Current Time Indicator */
            .rbc-current-time-indicator {
              background-color: #ea4335;
              height: 2px;
              z-index: 3;
            }
            .rbc-current-time-indicator::before {
              content: '';
              display: block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: #ea4335;
              position: absolute;
              left: -6px;
              top: -5px;
            }

            /* Agenda View */
            .rbc-agenda-view {
              background: transparent;
            }
            .rbc-agenda-view table.rbc-agenda-table {
              border: none;
              border-spacing: 0;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr {
              transition: background-color 0.2s;
              background-color: transparent !important;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr:hover {
              background-color: rgba(255,255,255,0.03) !important;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td {
              border-left: none;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr > td {
              border-top: 1px solid rgba(255,255,255,0.08);
            }
            .rbc-agenda-view table.rbc-agenda-table thead > tr > th {
              border-bottom: 2px solid rgba(255,255,255,0.08);
              padding: 16px;
              text-align: left;
              font-weight: 500;
              color: #9aa0a6;
              background-color: transparent;
              text-transform: uppercase;
              font-size: 0.8rem;
              letter-spacing: 0.5px;
            }
            .rbc-agenda-view table.rbc-agenda-table tbody > tr > td {
              padding: 16px;
              color: #e8eaed;
              background-color: transparent !important;
            }
            .rbc-agenda-date-cell {
              font-weight: 500;
              color: #8B5CF6;
            }
            .rbc-agenda-time-cell {
              font-size: 0.85rem;
              color: #9aa0a6;
              font-weight: 400;
            }
            .rbc-agenda-event-cell {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .rbc-agenda-event-cell::before {
              content: '';
              display: inline-block;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-color: currentColor; /* Will be overridden by inline style if possible, or just default */
            }
          `}} />
          {isFetching ? (
            <div className="h-[700px] flex items-center justify-center">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 700 }}
                messages={messagesConfig}
                culture="pt-BR"
                eventPropGetter={eventStyleGetter}
                view={view}
                onView={(newView) => setView(newView)}
                onSelectEvent={handleSelectEvent}
                min={new Date(0, 0, 0, 6, 0, 0)} // Start at 6 AM
                max={new Date(0, 0, 0, 22, 0, 0)} // End at 10 PM
                components={{
                  toolbar: CustomToolbar,
                  agenda: {
                    event: CustomAgendaEvent,
                  }
                }}
              />
              <div className="flex justify-start sm:justify-end items-center gap-4 pt-4 border-t border-[#2D214F] text-sm font-medium">
                <span className="text-[#5B4F81] mr-2">Legenda:</span>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/20 rounded-md transition-all duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[#10B981] flex items-center">
                    Confirmado (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-md transition-all duration-300">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                  <span className="text-[#F59E0B] flex items-center">
                    Pendente (
                    <div className="relative inline-flex items-center justify-center min-w-[12px] h-[20px] mx-1">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={events.filter(e => !e.isConfirmed).length}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {events.filter(e => !e.isConfirmed).length}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    )
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
