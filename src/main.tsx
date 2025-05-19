import { Provider } from '@/components/ui/provider';
import { createRoot } from 'react-dom/client';
import { UIRoot } from './app';
import { StrictMode } from 'react';
import { useBehavior } from './lib/hooks/use-behavior';
import { ColorTheme } from './pages/theme';

function App() {
    const theme = useBehavior(ColorTheme)
    return (
        <Provider forcedTheme={theme}>
            <UIRoot />
        </Provider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
