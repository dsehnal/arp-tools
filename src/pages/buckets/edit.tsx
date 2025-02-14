import Papa from 'papaparse';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { SmartFormatters, SmartInput, SmartParsers } from '@/lib/components/input';
import { SimpleSelect } from '@/lib/components/select';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { PlateModel, PlateVisual } from '@/lib/components/plate';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { arrayEqual, arrayMapAdd, resizeArray } from '@/lib/util/array';
import { uuid4 } from '@/lib/uuid';
import {
    Bucket,
    BucketData,
    BucketLayouts,
    BucketSampleInfo,
    BucketTemplateWell,
    DefaultBucket,
    getBucketTemplateWellKey,
} from '@/model/bucket';
import { formatCurve } from '@/model/curve';
import { PlateDimensions, PlateLayouts, PlateUtils } from '@/model/plate';
import { Alert, Box, Button, Flex, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { useRef } from 'react';
import { FaCopy, FaPaste, FaFileExport } from 'react-icons/fa6';
import { LuChartNoAxesCombined, LuDownload, LuSave, LuTrash } from 'react-icons/lu';
import { MdOutlineBorderClear } from 'react-icons/md';
import { useParams } from 'react-router';
import { BehaviorSubject, combineLatest, distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs';
import { CurvesApi } from '../curves/api';
import { Layout } from '../layout';
import { resolvePrefixedRoute } from '../routing';
import { BucketsApi } from './api';
import { bucketBreadcrumb, BucketsBreadcrumb, updateBucketTemplatePlate } from './common';
import { AsyncActionButton } from '@/lib/components/button';
import { download } from '@/lib/download';
import { formatConc } from '@/utils';

class EditBucketModel extends ReactiveModel {
    state = {
        bucket: new BehaviorSubject(DefaultBucket),
    };

    get bucket() {
        return this.state.bucket.value;
    }

    get template() {
        return this.state.bucket.value.template;
    }

    plate = new PlateModel(DefaultBucket.arp_labware.dimensions);

    update(next: Partial<Bucket>) {
        this.state.bucket.next({ ...this.bucket, ...next });
    }

    private syncPlate() {
        updateBucketTemplatePlate(this.plate, this.bucket);
    }

    clearCurve(kind: string) {
        this.update({
            sample_info: { ...this.bucket.sample_info, [kind]: { ...this.bucket.sample_info[kind], curve: undefined } },
        });
    }

    private copyWells: (BucketTemplateWell | undefined | null)[] = [];

    sampleInfo = {
        update: (info: BucketSampleInfo, update: Partial<BucketSampleInfo>) => {
            const index = this.bucket.sample_info.indexOf(info);
            if (index < 0) return;
            const next = [...this.bucket.sample_info];
            next[index] = { ...next[index], ...update };
            this.update({ sample_info: next });
        },
        add: () => {
            DialogService.show({
                title: 'Add Well Kind',
                body: AddWellKindDialog,
                state: new BehaviorSubject(''),
                onOk: (state) => {
                    if (!state) return;

                    const existing = this.bucket.sample_info.find((i) => i.kind.toLowerCase() === state.toLowerCase());
                    if (existing) {
                        throw new Error(`Kind ${state} already exists`);
                    }

                    const next = [...this.bucket.sample_info, { kind: state }];
                    this.update({ sample_info: next });
                },
            });
        },
        remove: (info: BucketSampleInfo) => {
            DialogService.confirm({
                title: 'Remove Well Kind',
                message: (
                    <>
                        Are you sure you want to remove the well kind <b>{info.kind}</b>? This will also remove any
                        wells of this kind.
                    </>
                ),
                onOk: () => {
                    const next = [...this.bucket.sample_info.filter((i) => i !== info)];
                    const wells = this.template.map((w) => (w?.kind === info.kind ? null : w));
                    this.update({ sample_info: next, template: wells });
                },
            });
        },
        selectCurve: async (info: BucketSampleInfo) => {
            const curves = await CurvesApi.list();
            const options = curves.map((c) => [c.id, formatCurve(c)]);
            const state = new BehaviorSubject('');
            DialogService.show({
                title: 'Select Curve',
                body: SelectCurveDialog,
                state,
                model: options,
                onOk: (state) => {
                    const curve = curves.find((c) => c.id === state);
                    this.sampleInfo.update(info, { curve });
                },
            });
        },
        clearCurve: (info: BucketSampleInfo) => {
            this.sampleInfo.update(info, { curve: undefined });
        },
    };

    templateBuilder = {
        updateLayout: (layout: string) => {
            const dimensions = PlateLayouts[layout];
            if (!dimensions) return;
            this.templateBuilder.updateDimensions(dimensions);
        },
        updateWell: (update: Partial<BucketTemplateWell>) => {
            const wells = [...this.template];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = { ...wells[idx], ...update };
            });

            this.update({
                template: wells,
            });
        },
        updateDimensions: (dimensions: PlateDimensions) => {
            this.update({
                template: resizeArray(this.bucket.template, PlateUtils.size(dimensions), undefined),
            });
        },
        pointIndex: () => {
            const byKind = new Map<string, number[]>();
            const { template } = this;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                const key = getBucketTemplateWellKey(template[idx]);
                if (!key) return;
                arrayMapAdd(byKind, key, idx);
            });

            const wells = [...this.template];
            byKind.forEach((xs) => {
                for (let i = 0; i < xs.length; i++) {
                    wells[xs[i]] = { ...wells[xs[i]], point_index: i };
                }
            });

            this.update({
                template: wells,
            });
        },
        copy: () => {
            this.copyWells = [];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                this.copyWells.push(this.template[idx]);
            });
        },
        paste: () => {
            if (!this.copyWells.length) return;

            const wells = [...this.template];
            let offset = 0;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = this.copyWells[offset++ % this.copyWells.length];
            });

            this.update({
                template: wells,
            });
        },
        pasteSmart: () => {
            if (!this.copyWells.length) return;

            let maxSampleIndex = -1;

            for (const w of this.template) {
                if (typeof w?.sample_index === 'number') maxSampleIndex = Math.max(w.sample_index, maxSampleIndex);
            }

            const copySampleIndexMap = new Map<number, number>();
            for (const w of this.copyWells) {
                if (typeof w?.sample_index !== 'number' || copySampleIndexMap.has(w.sample_index)) continue;
                copySampleIndexMap.set(w.sample_index, maxSampleIndex + copySampleIndexMap.size + 1);
            }

            const wells = [...this.template];
            let offset = 0;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                const well = this.copyWells[offset % this.copyWells.length];
                const loopIndex = Math.floor(offset / this.copyWells.length);
                offset++;
                if (typeof well?.sample_index === 'number') {
                    wells[idx] = {
                        ...well,
                        sample_index: loopIndex * copySampleIndexMap.size + copySampleIndexMap.get(well.sample_index)!,
                    };
                } else {
                    wells[idx] = well;
                }
            });

            this.update({
                template: wells,
            });
        },
        linearizeSampleIndices: () => {
            // TODO
        },
        clear: () => {
            const wells = [...this.template];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = undefined;
            });

            this.update({
                template: wells,
            });
        },
        export: () => {
            const rows: string[][] = [
                ['Well', 'Row', 'Col', 'Kind', 'Sample Index', 'Point Index', 'Is Control', 'Concentration'],
            ];
            const { template } = this;

            PlateUtils.forEachColMajorIndex(this.bucket.arp_labware.dimensions, (idx, row, col) => {
                const well = template[idx];
                const info = well ? this.bucket.sample_info.find((i) => i.kind === well.kind) : undefined;
                rows.push([
                    PlateUtils.wellLabel(row, col),
                    String(row + 1),
                    String(col + 1),
                    well?.kind || '',
                    typeof well?.sample_index === 'number' ? String(well.sample_index + 1) : '',
                    typeof well?.point_index === 'number' ? String(well.point_index + 1) : '',
                    info?.is_control ? 'Yes' : 'No',
                    formatConc(info?.curve?.points[well?.point_index ?? -1]?.target_concentration_M),
                ]);
            });

            const csv = Papa.unparse(rows, { header: true, delimiter: ',' });
            download(new Blob([csv], { type: 'text/csv' }), `bucket-template-${this.bucket.name}.csv`);
        },
    };

    mount(): void {
        this.subscribe(
            combineLatest([
                this.state.bucket.pipe(distinctUntilKeyChanged('template')),
                this.state.bucket.pipe(
                    distinctUntilChanged((a, b) => arrayEqual(a.arp_labware.dimensions, b.arp_labware.dimensions))
                ),
            ]),
            () => {
                this.syncPlate();
            }
        );
    }

    save = async () => {
        const bucket = { ...this.bucket, id: this.id };
        await BucketsApi.save(bucket);
        this.state.bucket.next(bucket);
        ToastService.success('Saved');
        window.history.replaceState(null, '', resolvePrefixedRoute(BucketsBreadcrumb.path!, bucket.id));
    };

    export = async () => {
        const bucket = { ...this.bucket };
        delete bucket.id;
        const data: BucketData = {
            kind: 'bucket',
            version: 1,
            bucket,
        };

        download(
            new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
            `bucket-${this.bucket.name}.json`
        );
    };

    async init() {
        if (this.id === 'new') {
            this.id = uuid4();
            return;
        }

        const bucket = await BucketsApi.get(this.id);
        if (bucket) {
            this.state.bucket.next(bucket);
        } else {
            throw new Error('Bucket not found');
        }
    }

    constructor(public id: string) {
        super();
    }
}

async function createModel(id: string) {
    const model = new EditBucketModel(id);
    await model.init();
    return model;
}

export function EditBucketUI() {
    const { id } = useParams();
    const { model, loading, error } = useAsyncModel(createModel, id);
    useReactiveModel(model);

    return (
        <Layout
            breadcrumbs={[
                BucketsBreadcrumb,
                bucketBreadcrumb({ isLoading: loading, name: <Breadcrumb model={model} />, id: model?.id }),
            ]}
            buttons={!!model && <NavButtons model={model} />}
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <EditBucket model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function Breadcrumb({ model }: { model?: EditBucketModel }) {
    const bucket = useBehavior(model?.state.bucket);
    if (!bucket?.id) return 'New Bucket';
    return bucket.name || 'Unnamed Bucket';
}

function NavButtons({ model }: { model: EditBucketModel }) {
    return (
        <HStack gap={2}>
            <AsyncActionButton action={model.save} size='xs' colorPalette='blue'>
                <LuSave /> Save
            </AsyncActionButton>
            <AsyncActionButton action={model.export} size='xs' colorPalette='blue'>
                <LuDownload /> Export
            </AsyncActionButton>
        </HStack>
    );
}

function EditBucket({ model }: { model: EditBucketModel }) {
    const bucket = useBehavior(model.state.bucket);

    return (
        <VStack gapY={2}>
            <Field label='Name'>
                <SmartInput
                    placeholder='Enter bucket name'
                    value={bucket.name}
                    parse={SmartParsers.trim}
                    onChange={(name) => model.update({ name })}
                    index={0}
                    size='sm'
                />
            </Field>
            <Field label='Description'>
                <SmartInput
                    placeholder='Enter optional description'
                    value={bucket.description}
                    parse={SmartParsers.trim}
                    onChange={(description) => model.update({ description })}
                    index={1}
                    size='sm'
                />
            </Field>
            <Field label='Project'>
                <SmartInput
                    placeholder='Enter optional project'
                    value={bucket.project}
                    parse={SmartParsers.trim}
                    onChange={(project) => model.update({ project })}
                    index={2}
                    size='sm'
                />
            </Field>
            <Field label='Normalize Solvent'>
                <SimpleSelect
                    value={bucket.normalize_solvent}
                    onChange={(normalize_solvent) => model.update({ normalize_solvent })}
                    options={['per-curve', 'global', 'no']}
                    size='sm'
                />
            </Field>
            <LabwareEditor model={model} kind='source_labware' />
            <LabwareEditor model={model} kind='arp_labware' />

            <Flex alignItems='flex-start' w='100%' gap={4}>
                <Box width={640} height={480} minW={640} maxW={640} position='relative'>
                    <PlateVisual model={model.plate} />
                </Box>
                <VStack gap={1} flexGrow={1} alignItems='flex-start'>
                    <HStack gap={2}>
                        <Text fontSize='md' fontWeight='bold'>
                            Well Kinds
                        </Text>
                        <Button variant='subtle' size='xs' colorPalette='gray' onClick={model.sampleInfo.add}>
                            Add
                        </Button>
                    </HStack>
                    {bucket.sample_info.map((info, index) => (
                        <SampleInfoControls key={index} model={model} info={info} />
                    ))}

                    <Text fontSize='md' fontWeight='bold'>
                        Sample Indexing
                    </Text>
                    <SampleIndexing model={model} />

                    <Text fontSize='md' fontWeight='bold'>
                        Helpers
                    </Text>
                    <HStack gap={2} alignItems='flex-start' w='100%'>
                        <Button variant='subtle' size='xs' onClick={model.templateBuilder.copy}>
                            <FaCopy /> Copy
                        </Button>
                        <Button variant='subtle' size='xs' onClick={model.templateBuilder.paste}>
                            <FaPaste /> Paste Exact
                        </Button>
                        <Button
                            variant='subtle'
                            size='xs'
                            onClick={model.templateBuilder.pasteSmart}
                            title='Automatically increment sample indices'
                        >
                            <FaPaste /> Paste Smart
                        </Button>
                        <Button variant='subtle' size='xs' onClick={model.templateBuilder.clear}>
                            <MdOutlineBorderClear /> Clear Selected Wells
                        </Button>
                        <Button variant='subtle' size='xs' onClick={model.templateBuilder.export}>
                            <FaFileExport /> Export CSV
                        </Button>
                    </HStack>
                </VStack>
            </Flex>
        </VStack>
    );
}

function LabwareEditor({ model, kind }: { model: EditBucketModel; kind: 'source_labware' | 'arp_labware' }) {
    const labware = model.bucket[kind];
    const w = '150px';
    return (
        <HStack gap={2} w='100%'>
            <Field label={kind === 'source_labware' ? 'Source Labware' : 'ARP Labware'} minW={w} maxW={w}>
                <SimpleSelect
                    value={String(PlateUtils.size(labware.dimensions))}
                    onChange={(layout) => model.update({ [kind]: { ...labware, dimensions: PlateLayouts[layout] } })}
                    options={BucketLayouts}
                    size='sm'
                />
            </Field>
            <Field label='Dead Volume (uL)' minW={w} maxW={w}>
                <SmartInput
                    value={labware.dead_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-7)}
                    onChange={(v) => model.update({ [kind]: { ...labware, dead_volume_l: v } })}
                    index={2}
                    size='sm'
                />
            </Field>
            <Field label='Well Volume (uL)' minW={w} maxW={w}>
                <SmartInput
                    value={labware.well_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-7)}
                    onChange={(v) => model.update({ [kind]: { ...labware, well_volume_l: v } })}
                    index={2}
                    size='sm'
                />
            </Field>
            <Field label='Shorthand' minW={w} maxW={w}>
                <SmartInput
                    placeholder='Shorthand'
                    value={labware.shorthand}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ [kind]: { ...labware, shorthand: v } })}
                    size='sm'
                />
            </Field>
            <Field label='Name'>
                <SmartInput
                    placeholder='Labware Name'
                    value={labware.name}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ [kind]: { ...labware, name: v } })}
                    size='sm'
                />
            </Field>
        </HStack>
    );
}

function SampleIndexing({ model }: { model: EditBucketModel }) {
    const sampleIndex = useRef<HTMLInputElement>(null);
    const pointIndex = useRef<HTMLInputElement>(null);

    const applySampleIndex = () => {
        const idx = SmartParsers.number(sampleIndex.current!.value);
        model.templateBuilder.updateWell({
            sample_index: idx === null ? undefined : idx - 1,
        });
        sampleIndex.current!.value = '';
    };

    const applyPointIndex = () => {
        const idx = SmartParsers.number(sampleIndex.current!.value);
        if (typeof idx !== 'number') {
            model.templateBuilder.pointIndex();
        } else {
            model.templateBuilder.updateWell({
                point_index: idx - 1,
            });
        }
        sampleIndex.current!.value = '';
    };

    return (
        <>
            <HStack gap={1} alignItems='flex-start' w='100%'>
                <Input
                    ref={sampleIndex}
                    size='xs'
                    placeholder='Sample Index'
                    w='140px'
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLElement).blur();
                            applySampleIndex();
                        }
                    }}
                />
                <Button variant='subtle' colorPalette='blue' size='xs' onClick={applySampleIndex}>
                    Full Sample Index
                </Button>
            </HStack>

            <HStack gap={1} alignItems='flex-start' w='100%'>
                <Input
                    ref={pointIndex}
                    size='xs'
                    placeholder='Curve Point Index'
                    w='140px'
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.target as HTMLElement).blur();
                            applyPointIndex();
                        }
                    }}
                />

                <Button variant='subtle' colorPalette='blue' size='xs' onClick={applyPointIndex}>
                    Fill Point Index
                </Button>
            </HStack>
        </>
    );
}

function SampleInfoControls({ model, info }: { model: EditBucketModel; info: BucketSampleInfo }) {
    return (
        <HStack gap={1} w='100%' wrap='wrap'>
            <Button variant='plain' size='xs' onClick={() => model.sampleInfo.remove(info)} px={0}>
                <LuTrash />
            </Button>
            <Button
                variant='subtle'
                colorPalette='blue'
                size='xs'
                onClick={() => model.templateBuilder.updateWell({ kind: info.kind })}
                w='80px'
                title='Apply well kind'
            >
                {info.kind}
            </Button>
            <Switch
                size='xs'
                checked={!!info.is_control}
                onCheckedChange={(e) => model.sampleInfo.update(info, { is_control: e.checked })}
                mx={1}
            >
                Control
            </Switch>
            <AsyncActionButton variant='outline' size='xs' action={() => model.sampleInfo.selectCurve(info)}>
                <LuChartNoAxesCombined /> {info?.curve ? formatCurve(info.curve) : 'Select Curve'}
            </AsyncActionButton>
            {info.is_control && (
                <Box w='140px'>
                    <SmartInput
                        size='xs'
                        placeholder='Control Sample Id'
                        value={info.default_sample_id}
                        onChange={(v) => model.sampleInfo.update(info, { default_sample_id: v?.trim() || undefined })}
                    />
                </Box>
            )}
        </HStack>
    );
}

function SelectCurveDialog({
    model: options,
    state,
}: {
    model: [string, string][];
    state: BehaviorSubject<string | undefined>;
}) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    Selecting a curve will create a local copy for this bucket. If you modify the curve, you will have
                    to re-select it.
                </Alert.Title>
            </Alert.Root>
            <SimpleSelect
                placeholder='Select curve...'
                value={current}
                allowEmpty
                onChange={(v) => state.next(v)}
                options={options}
            />
        </VStack>
    );
}

function AddWellKindDialog({ state }: { state: BehaviorSubject<string> }) {
    const current = useBehavior(state);
    return (
        <SmartInput
            size='xs'
            placeholder='Enter kind...'
            value={current}
            parse={SmartParsers.trim}
            onChange={(v) => state.next(v)}
        />
    );
}
