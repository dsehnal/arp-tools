import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { FileDropArea } from '@/lib/components/file-upload';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { uuid4 } from '@/lib/util/uuid';
import { DilutionCurve, readCurve } from '@/api/model/curve';
import { formatUnit, roundValue } from '@/utils';
import { Button, HStack, Table } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { resolveRoute } from '../routing';
import { CurvesApi } from './api';
import { CurvesBreadcrumb } from './common';
import { formatISODateString } from '@/lib/util/datetime';
import { LuCirclePlus, LuCopy, LuImport, LuPencil, LuTrash } from 'react-icons/lu';

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
        <HStack gap={1}>
            <Button onClick={() => model.import(navigate)} size='xs' colorPalette='blue' variant='subtle'>
                <LuImport /> Import
            </Button>
            <Button onClick={() => navigate(resolveRoute(CurvesBreadcrumb.path!, 'new'))} size='xs' colorPalette='blue'>
                <LuCirclePlus /> New Curve
            </Button>
        </HStack>
    );
}

function CurveList({ model }: { model: CurvesModel }) {
    const curves = useBehavior(model.state.curves);
    const navigate = useNavigate();
    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader># Points</Table.ColumnHeader>
                        <Table.ColumnHeader>Top Concentration</Table.ColumnHeader>
                        <Table.ColumnHeader>Assay Volume</Table.ColumnHeader>
                        <Table.ColumnHeader>Intermediate Volume</Table.ColumnHeader>
                        <Table.ColumnHeader>Modified On</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {curves.map((curve) => (
                        <Table.Row
                            key={curve.id}
                            onDoubleClick={() => navigate(resolveRoute(CurvesBreadcrumb.path!, curve.id!))}
                        >
                            <Table.Cell>{curve.name ?? 'unnamed'}</Table.Cell>
                            <Table.Cell>
                                {curve.points.length} ({roundValue(curve.options?.dilution_factor ?? 0, 2)} factor)
                            </Table.Cell>
                            <Table.Cell>{formatUnit(curve.points[0].target_concentration_m, 'M')}</Table.Cell>
                            <Table.Cell>{formatUnit(curve.options?.assay_volume_l, 'L')}</Table.Cell>
                            <Table.Cell>{formatUnit(curve.options?.intermediate_volume_l, 'L')}</Table.Cell>
                            <Table.Cell>{formatISODateString(curve.modified_on)}</Table.Cell>
                            <Table.Cell textAlign='right' padding={1}>
                                <Button size='xs' colorPalette='blue' variant='subtle' asChild title='Edit'>
                                    <Link to={resolveRoute(CurvesBreadcrumb.path!, curve.id!)}>
                                        <LuPencil />
                                    </Link>
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    onClick={() => model.duplicate(curve, navigate)}
                                    variant='subtle'
                                    title='Duplicate'
                                    ms={1}
                                >
                                    <LuCopy />
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={1}
                                    onClick={() => model.remove(curve.id!)}
                                    title='Remove'
                                    variant='subtle'
                                >
                                    <LuTrash />
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
