import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { ProviderPage } from './pages/ProviderPage';
import { Onboarding } from './pages/Onboarding';
import { ResetPassword } from './pages/ResetPassword';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { DashboardSettings } from './pages/DashboardSettings';
import { DashboardAccount } from './pages/DashboardAccount';
import { DashboardCalendar } from './pages/DashboardCalendar';
import { NotFound } from './pages/NotFound';
import { TermsPage } from './pages/TermsPage';
import { AuthProvider } from './contexts/AuthContext';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Nova atualização disponível!', {
        description: 'Clique em atualizar para carregar a nova versão do aplicativo.',
        action: {
          label: 'Atualizar',
          onClick: () => {
            updateSW(true);
          }
        },
        duration: Infinity
      });
    },
    onRegistered(r) {
      console.log('SW Registered: ', r);
      // Verifica se há atualização a cada 1 hora
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    }
  });
}

import { Toaster, toast } from 'sonner';

// Global fetch interceptor for Rate Limiting (429 Too Many Requests)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch.apply(this, args);
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    let message = 'Você fez muitas requisições recentemente. Por favor, aguarde um momento antes de tentar novamente.';
    
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        if (seconds < 60) {
           message = `Muitas requisições. Tente novamente em ${seconds} segundos.`;
        } else {
           message = `Muitas requisições. Tente novamente em ${Math.ceil(seconds / 60)} minuto(s).`;
        }
      }
    }
    
    // Show toast for rate limit
    toast.error('Acesso Limitado Temporariamente', {
      description: message,
      duration: 5000,
    });
  }
  return response;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/onboarding",
    element: <Onboarding />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/termos",
    element: <TermsPage />,
  },
  {
    path: "/p/:slug",
    element: <ProviderPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardHome />,
      },
      {
        path: "calendar",
        element: <DashboardCalendar />,
      },
      {
        path: "settings",
        element: <DashboardSettings />,
      },
      {
        path: "account",
        element: <DashboardAccount />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
        <RouterProvider router={router} />
        <Toaster />
      </GoogleReCaptchaProvider>
    </AuthProvider>
  </StrictMode>,
);
