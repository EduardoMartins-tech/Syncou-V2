import { toast } from 'sonner';

export function useNotification() {
  const notifySuccess = (message: string = 'Dados salvos com sucesso') => {
    toast.success(message);
  };

  const notifyError = (message: string = 'Ocorreu um erro inesperado', errorContext?: any) => {
    console.error('Notification Error:', message, errorContext);
    toast.error(message);
  };

  const notifyFormError = (errors: Record<string, any>) => {
    const errorMessages = Object.values(errors).map((e: any) => e?.message).filter(Boolean);
    if (errorMessages.length > 0) {
      toast.error(`Campos inválidos: ${errorMessages.join(', ')}`);
    } else {
      toast.error('Por favor, verifique os campos do formulário.');
    }
  };

  const notifyInfo = (message: string) => {
    toast.info(message);
  };
  
  const notifyLoading = (message: string) => {
    return toast.loading(message);
  };

  const dismiss = (toastId?: string | number) => {
    toast.dismiss(toastId);
  };

  return {
    notifySuccess,
    notifyError,
    notifyFormError,
    notifyInfo,
    notifyLoading,
    dismiss,
    toast, // Expondo a instância original caso precise de algo mais específico
  };
}
