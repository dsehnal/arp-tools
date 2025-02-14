import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { FileDropArea } from '@/lib/components/file-upload';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { uuid4 } from '@/lib/uuid';
import { DilutionCurve, readCurve } from '@/model/curve';
import { formatConc } from '@/utils';
import { Button, HStack, Table } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { resolveRoute } from '../routing';
import { CurvesApi } from './api';
import { CurvesBreadcrumb } from './common';

class CurvesModel extends ReactiveModel {
    state = {
        curves: new BehaviorSubject<DilutionCurve[]>([]),
    };

    async init() {
        const curves = await CurvesApi.list();
        this.state.curves.next(curves);
    }

    remove = (id: string) => {
        DialogService.confirm({
            title: 'Remove Curve',
            message: 'Are you sure you want to remove this curve?',
            onOk: async () => {
                await CurvesApi.remove(id);
                await this.init();
            },
        });
    };

    duplicate(bucket: DilutionCurve, navigate: NavigateFunction) {
        DialogService.confirm({
            title: 'Duplicate Curve',
            message: 'Do you want to duplicate this curve?',
            onOk: () => this.applyDuplicate(bucket, navigate),
        });
    }

    async applyDuplicate(curve: DilutionCurve, navigate: NavigateFunction) {
        const newCurve = { ...curve, id: uuid4(), name: `Copy of ${curve.name}` };
        await CurvesApi.save(newCurve);
        navigate(resolveRoute(CurvesBreadcrumb.path!, newCurve.id));
    }

    import(navigate: NavigateFunction) {
        DialogService.show({
            title: 'Create Request',
            body: ImportCurveDialog,
            state: new BehaviorSubject({ files: [] }),
            onOk: async ({ files }: { files: File[] }) => {
                if (!files[0]) {
                    throw new Error('No file selected');
                }

                const file = files[0];
                const data = await file.text();
                const curve = { ...readCurve(JSON.parse(data)), id: uuid4() };
                await CurvesApi.save(curve);
                navigate(resolveRoute(CurvesBreadcrumb.path!, curve.id));
            },
        });
    }
}

async function createModel() {
    const model = new CurvesModel();
    await model.init();
    return model;
}

export function CurvesUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <Layout breadcrumbs={[CurvesBreadcrumb]} buttons={!!model && <NavButtons model={model} />}>
            <AsyncWrapper loading={!model || loading} error={error}>
                <CurveList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: CurvesModel }) {
    const navigate = useNavigate();

    return (
        <HStack gap={2}>
            <Button onClick={() => navigate(resolveRoute(CurvesBreadcrumb.path!, 'new'))} size='xs' colorPalette='blue'>
                New Curve
            </Button>
            <Button onClick={() => model.import(navigate)} size='xs' colorPalette='blue'>
                Import
            </Button>
        </HStack>
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

function ImportCurveDialog({ state }: { state: BehaviorSubject<{ files: File[] }> }) {
    return <FileDropArea onChange={(files) => state.next({ files })} extensions={['.json']} />;
}
