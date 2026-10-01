import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/serviceWorkerRegistration';

// Register PWA service worker with scope '/'
registerServiceWorker();

createRoot(document.getElementById('root')!).render(<App />);
