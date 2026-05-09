import { useToast } from '../components/ToastProvider';

export const useApiError = () => {
  const { showToast } = useToast();

  const handleError = (error: any, fallback = 'An unexpected error occurred') => {
    const message = error?.response?.data?.message || 
                   error?.message || 
                   fallback;
    showToast(message, 'error');
  };

  return { handleError };
};

