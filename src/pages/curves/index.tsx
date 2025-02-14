import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { DilutionCurve } from '@/model/curve';
import { formatConc } from '@/utils';
import { Box, Button, Table, VStack } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { CurvesApi } from './api';
import { CurvesBreadcrumb } from './common';
import { uuid4 } from '@/lib/uuid';
import { resolveRoute } from '../routing';

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

    duplicate(bucket: DilutionCurve, navigate: NavigateFunction) {
        DialogService.confirm({
            title: 'Duplicate Bucket',
            message: 'Do you want to duplicate this curve?',
            onOk: () => this.applyDuplicate(bucket, navigate),
        });
    }

    async applyDuplicate(curve: DilutionCurve, navigate: NavigateFunction) {
        const newCurve = { ...curve, id: uuid4(), name: `Copy of ${curve.name}` };
        await CurvesApi.save(newCurve);
        navigate(resolveRoute(CurvesBreadcrumb.path!, newCurve.id));
    }
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
                <Button
                    onClick={() => navigate(resolveRoute(CurvesBreadcrumb.path!, 'new'))}
                    size='xs'
                    colorPalette='blue'
                >
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
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
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
                            <Table.Cell>{formatConc(curve.points[0].target_concentration_M)}</Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell textAlign='right'>
                                <Button size='xs' colorPalette='blue' variant='subtle' asChild>
                                    <Link to={resolveRoute(CurvesBreadcrumb.path!, curve.id!)}>Edit</Link>
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    onClick={() => model.duplicate(curve, navigate)}
                                    variant='subtle'
                                    ms={2}
                                >
                                    Duplicate
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
    );
}
