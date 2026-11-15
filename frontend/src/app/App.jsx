import { RouterProvider } from 'react-router-dom';
import { router } from './router.jsx';
import { ToastProvider } from '../components/ToastProvider.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
