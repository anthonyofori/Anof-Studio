import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './firebase/authContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
