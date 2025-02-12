import { BrowserRouter, Route, Routes } from 'react-router';
import { Toaster } from './components/ui/toaster';
import { DialogProvider } from './lib/services/dialog';
import { BucketsUI } from './pages/buckets';
import { EditBucketUI } from './pages/buckets/edit';
import { CurvesUI } from './pages/curves';
import { EditCurveUI } from './pages/curves/edit';
import { LabwareUI } from './pages/labware';
import { ProductionUI } from './pages/production';
import { RequestsUI } from './pages/requests';

const Pages = {
    requests: <RequestsUI />,
    production: <ProductionUI />,
    curves: <CurvesUI />,
    curve: <EditCurveUI />,
    buckets: <BucketsUI />,
    bucket: <EditBucketUI />,
    labware: <LabwareUI />,
};

export function UIRoot() {
    return (
        <>
            <BrowserRouter>
                <Routes>
                    <Route path='curves'>
                        <Route index element={Pages.curves} />
                        <Route path=':id' element={Pages.curve} />
                    </Route>
                    <Route path='buckets'>
                        <Route index element={Pages.buckets} />
                        <Route path=':id' element={Pages.bucket} />
                    </Route>
                </Routes>
            </BrowserRouter>
            <Toaster />
            <DialogProvider />
        </>
    );
}
