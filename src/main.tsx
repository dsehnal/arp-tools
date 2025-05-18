import { Provider } from '@/components/ui/provider';
import { createRoot } from 'react-dom/client';
import { UIRoot } from './app';
import { StrictMode } from 'react';
import { createSystem } from '@chakra-ui/react';

createSystem({

})

function App() {
    return (
        <Provider forcedTheme='dark'>
            <UIRoot />
        </Provider>
    );
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
