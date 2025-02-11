import { Box, Flex, Tabs } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router';
import { BucketsUI } from './pages/buckets';
import { CurvesUI } from './pages/curves';
import { EditCurveUI } from './pages/curves/edit';
import { LabwareUI } from './pages/labware';
import { ProductionUI } from './pages/production';
import { RequestsUI } from './pages/requests';
import { Toaster } from './components/ui/toaster';
import { EditBucketUI } from './pages/buckets/edit';

type Tab = 'requests' | 'production' | 'curves' | 'labware' | 'buckets';

const Pages = {
    requests: <RequestsUI />,
    production: <ProductionUI />,
    curves: <CurvesUI />,
    buckets: <BucketsUI />,
    labware: <LabwareUI />,
};

const Headers = [
    ['requests', 'Requests'],
    ['production', 'Production'],
    ['curves', 'Curves'],
    ['labware', 'Labware'],
    ['buckets', 'Buckets'],
] as const;

export function UIRoot() {
    return (
        <BrowserRouter>
            <Routes>
                {Headers.map((h) => (
                    <Route key={h[0]} path={h[0]} element={<PagesUI tab={h[0]} page={Pages[h[0]]} />} />
                ))}
                <Route path='curves/:id' element={<PagesUI tab='curves' page={<EditCurveUI />} />} />
                <Route path='buckets/:id' element={<PagesUI tab='buckets' page={<EditBucketUI />} />} />
                <Route path='*' element={<PagesUI tab='requests' page={Pages.requests} />} />
            </Routes>
        </BrowserRouter>
    );
}

function PagesUI({ tab, page }: { tab: Tab; page: ReactNode }) {
    const navigate = useNavigate();

    return (
        <>
            <Flex direction='column'>
                <Tabs.Root
                    value={tab}
                    onValueChange={(e) => navigate(`/${e.value}`)}
                    position='fixed'
                    background='black'
                    width='100%'
                    zIndex={10000}
                >
                    <Tabs.List>
                        {Headers.map((h) => (
                            <Tabs.Trigger key={h[0]} value={h[0]}>
                                {h[1]}
                            </Tabs.Trigger>
                        ))}
                        <Box margin='auto' />
                        <Flex alignItems='center' marginRight={4}>
                            <b>ARP Tools</b>
                        </Flex>
                    </Tabs.List>
                </Tabs.Root>

                <Box flexGrow={1} padding={4} top={41} pos='absolute' bottom={0} right={0} left={0}>
                    {page}
                </Box>
            </Flex>
            <Toaster />
        </>
    );
}
