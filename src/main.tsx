import { Provider } from '@/components/ui/provider';
import { createRoot } from 'react-dom/client';
import { UIRoot } from './app';
import { StrictMode } from 'react';

function App() {
    return (
        <Provider>
            <UIRoot />
        </Provider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
