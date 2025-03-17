import { BrowserRouter, HashRouter, Route, Routes } from 'react-router';
import { Toaster } from './components/ui/toaster';
import { DialogProvider } from './lib/services/dialog';
import { BucketsUI } from './pages/buckets';
import { EditBucketUI } from './pages/buckets/edit';
import { CurvesUI } from './pages/curves';
import { EditCurveUI } from './pages/curves/edit';
import { RequestsUI } from './pages/requests';
import { ProductionsUI } from './pages/production';
import { EditRequestUI } from './pages/requests/edit';
import { RoutingKind } from './pages/routing';
import { SettingsUI } from './pages/settings';
import { Layout } from './pages/layout';
import { Box } from '@chakra-ui/react';

const Pages = [
    ['requests', <RequestsUI />, <EditRequestUI />],
    ['production', <ProductionsUI />],
    ['curves', <CurvesUI />, <EditCurveUI />],
    ['buckets', <BucketsUI />, <EditBucketUI />],
    ['settings', <SettingsUI />],
] as const;

export function UIRoot() {
    const Router = RoutingKind === 'browser' ? BrowserRouter : HashRouter;
    return (
        <>
            <Router>
                <Routes>
                    {Pages.map(([path, index, edit]) => (
                        <Route path={path} key={path}>
                            <Route index element={index} />
                            {!!edit && <Route path=':id' element={edit} />}
                        </Route>
                    ))}
                    <Route path='/' element={Pages[0][1]} />
                    <Route path='*' element={<NotFound />} />
                </Routes>
            </Router>
            <Toaster />
            <DialogProvider />
        </>
    );
}

function NotFound() {
    return (
        <Layout>
            <Box>Not Found</Box>
        </Layout>
    );
}
