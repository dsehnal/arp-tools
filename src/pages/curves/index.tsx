import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { DilutionCurve } from '@/model/curve';
import { formatConc } from '@/utils';
import { Box, Button, Table, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { CurvesApi } from './api';
import { curvePath, CurvesBreadcrumb } from './common';

class CurvesModel extends ReactiveModel {
    state = {
        curves: new BehaviorSubject<DilutionCurve[]>([]),
    };

    async init() {
        const curves = await CurvesApi.list();
        this.state.curves.next(curves);
    }

    remove = async (id: string) => {
        DialogService.confirm({
            title: 'Remove Bucket',
            message: 'Are you sure you want to remove this curve?',
            onOk: async () => {
                await CurvesApi.remove(id);
                await this.init();
            },
        });
    };
}

async function createModel() {
    const model = new CurvesModel();
    await model.init();
    return model;
}

export function CurvesUI() {
    const { model, loading, error } = useAsyncModel(createModel);
    const navigate = useNavigate();

    return (
        <Layout
            breadcrumbs={[CurvesBreadcrumb]}
            buttons={
                <Button onClick={() => navigate(curvePath('new'))} size='xs' colorPalette='blue'>
                    New Curve
                </Button>
            }
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <CurveList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function CurveList({ model }: { model: CurvesModel }) {
    const curves = useBehavior(model.state.curves);
    const navigate = useNavigate();
    return (
        <VStack gap={2} w='100%'>
            <Box w='100%'>
                <Table.ScrollArea borderWidth='1px' w='100%'>
                    <Table.Root size='sm' stickyHeader>
                        <Table.Header>
                            <Table.Row bg='bg.subtle'>
                                <Table.ColumnHeader>Name</Table.ColumnHeader>
                                <Table.ColumnHeader># Points</Table.ColumnHeader>
                                <Table.ColumnHeader>Top Concentration</Table.ColumnHeader>
                                <Table.ColumnHeader></Table.ColumnHeader>
                                <Table.ColumnHeader></Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {curves.map((curve) => (
                                <Table.Row key={curve.id}>
                                    <Table.Cell>{curve.name ?? 'unnamed'}</Table.Cell>
                                    <Table.Cell>{curve.points.length}</Table.Cell>
                                    <Table.Cell>{formatConc(curve.points[0].target_concentration_m)}</Table.Cell>
                                    <Table.Cell></Table.Cell>
                                    <Table.Cell textAlign='right'>
                                        <Button
                                            size='xs'
                                            colorPalette='blue'
                                            onClick={() => navigate(`/curves/${curve.id}`)}
                                            variant='subtle'
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size='xs'
                                            colorPalette='red'
                                            ms={2}
                                            onClick={() => model.remove(curve.id!)}
                                            variant='subtle'
                                        >
                                            Remove
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            </Box>
        </VStack>
    );
}
