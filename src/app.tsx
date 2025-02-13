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

const Pages = [
    ['requests', <RequestsUI />, <EditRequestUI />],
    ['production', <ProductionsUI />],
    ['curves', <CurvesUI />, <EditCurveUI />],
    ['buckets', <BucketsUI />, <EditBucketUI />],
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
                    <Route path='*' element={<RequestsUI />} />
                </Routes>
            </Router>
            <Toaster />
            <DialogProvider />
        </>
    );
}
