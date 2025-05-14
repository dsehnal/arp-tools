import {
    Bucket,
    BucketLayouts,
    BucketSampleInfo,
    BucketTemplateWell,
    DefaultBucket,
    getBucketTemplateWellKey,
    writeBucket,
} from '@/lib/tools/model/bucket';
import { DilutionCurve, formatCurve, readCurve, writeCurve } from '@/lib/tools/model/curve';
import { PlateDimensions, PlateLayouts, PlateUtils } from '@/lib/tools/model/plate';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { InfoTip } from '@/components/ui/toggle-tip';
import { AsyncWrapper } from '@/components/async-wrapper';
import { AsyncActionButton } from '@/components/button';
import { SmartFormatters, SmartInput, SmartParsers } from '@/components/input';
import { PlateModel, PlateVisual } from '@/components/plate';
import { SimpleSelect } from '@/components/select';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { arrayEqual, arrayMapAdd, resizeArray } from '@/lib/util/collections';
import { download } from '@/lib/util/download';
import { uuid4 } from '@/lib/util/uuid';
import {
    Alert,
    AspectRatio,
    Badge,
    Box,
    Button,
    Flex,
    Group,
    HStack,
    Input,
    Kbd,
    Table,
    Text,
    VStack,
} from '@chakra-ui/react';
import Papa from 'papaparse';
import { useRef } from 'react';
import { FaCopy, FaFileExport, FaMagnifyingGlass, FaPaste } from 'react-icons/fa6';
import { LuChartNoAxesCombined, LuCirclePlus, LuDownload, LuSave, LuSignal, LuTrash } from 'react-icons/lu';
import { MdOutlineBorderClear } from 'react-icons/md';
import { useParams } from 'react-router';
import { BehaviorSubject, combineLatest, distinctUntilChanged, distinctUntilKeyChanged } from 'rxjs';
import { CurvesApi } from '../curves/api';
import { Layout } from '../layout';
import { resolvePrefixedRoute } from '../routing';
import { BucketsApi } from './api';
import { bucketBreadcrumb, BucketsBreadcrumb, updateBucketTemplatePlate } from './common';
import { formatUnit } from '@/lib/util/units';
import { CtrlOrMeta, isEventTargetInput } from '@/lib/util/events';
import { FaDownload, FaEdit, FaUndo } from 'react-icons/fa';
import { FileDropArea } from '@/components/file-upload';
import { memoizeLatest } from '@/lib/util/misc';
import { validateBucket } from '@/lib/tools/bucket';
import { downloadCurve, showCurveDetails } from '../curves/common';

class EditBucketModel extends ReactiveModel {
    state = {
        bucket: new BehaviorSubject(DefaultBucket),
        templateHistory: new BehaviorSubject<Bucket['template'][]>([]),
    };

    get bucket() {
        return this.state.bucket.value;
    }

    get template() {
        return this.state.bucket.value.template;
    }

    plate = new PlateModel(DefaultBucket.arp_labware.dimensions);

    private _validation = memoizeLatest(validateBucket);
    get validation() {
        return this._validation(this.bucket);
    }

    update(next: Partial<Bucket>, pushTemplateHistory = true) {
        if (pushTemplateHistory && this.bucket.template !== next.template) {
            this.state.templateHistory.next([...this.state.templateHistory.value, this.bucket.template]);
        }
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
        selectCurve: async (info?: BucketSampleInfo) => {
            const curves = await CurvesApi.list();
            const options = curves.map((c) => [c.id, formatCurve(c)]);
            const state = new BehaviorSubject({ name: '', files: [] });
            DialogService.show({
                title: 'Select Curve',
                body: SelectCurveDialog,
                state,
                model: options,
                onOk: async (state: { name?: string; files: File[] }) => {
                    let curve: DilutionCurve | undefined;

                    if (state.files.length) {
                        const json = JSON.parse(await state.files[0].text());
                        curve = readCurve(json);
                    } else {
                        const srcCurve = curves.find((c) => c.id === state.name);
                        curve = srcCurve ? writeCurve(srcCurve).data : undefined;
                    }
                    if (!info) {
                        this.update({ curve });
                    } else {
                        this.sampleInfo.update(info, { curve });
                    }
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
        undo: () => {
            const history = this.state.templateHistory.value;
            const prev = history[history.length - 1];
            if (!prev) return;
            this.state.templateHistory.next(history.slice(0, history.length - 1));
            this.update({ template: prev }, false);
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
                    formatUnit(info?.curve?.points[well?.point_index ?? -1]?.target_concentration_m, 'M'),
                ]);
            });

            const csv = Papa.unparse(rows, { header: true, delimiter: ',' });
            download(new Blob([csv], { type: 'text/csv' }), `bucket-template-${this.bucket.name}.csv`);
        },
    };

    private getShortcutAction(ev: KeyboardEvent) {
        if (ev.ctrlKey || ev.metaKey) {
            if (/^\d$/.test(ev.key)) {
                const kind = this.bucket.sample_info[+ev.key - 1]?.kind;
                if (kind) {
                    return () => this.templateBuilder.updateWell({ kind });
                }
            }

            const key = ev.key.toLowerCase();
            if (key === 'c') {
                return this.templateBuilder.copy;
            } else if (key.toLowerCase() === 'v' && !ev.shiftKey) {
                return this.templateBuilder.paste;
            } else if (key === 'v' && ev.shiftKey) {
                return this.templateBuilder.pasteSmart;
            } else if (key === 'x') {
                return this.templateBuilder.clear;
            } else if (key === 'd') {
                return this.templateBuilder.pointIndex;
            } else if (key === 'z') {
                return this.templateBuilder.undo;
            }
        }

        if (ev.key === 'Enter') {
            return () => this.plate.moveSelection([1, 0]);
        }
    }

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

        let currentSampleIndex = '';

        this.subscribe(this.plate.state.pipe(distinctUntilKeyChanged('selection')), () => {
            currentSampleIndex = '';
        });

        this.event(window, 'keydown', (ev) => {
            if (!this.plate.isActive || isEventTargetInput(ev)) return;

            let updateSampleIndex = false;
            if (!ev.ctrlKey && !ev.metaKey) {
                const isNum = /^\d$/.test(ev.key);
                if (isNum) {
                    currentSampleIndex += ev.key;
                    updateSampleIndex = true;
                } else if (ev.key === 'Backspace') {
                    currentSampleIndex = currentSampleIndex.slice(0, currentSampleIndex.length - 1);
                    updateSampleIndex = true;
                } else {
                    currentSampleIndex = '';
                }
            }

            let action: (() => void) | undefined;
            if (updateSampleIndex) {
                const idx = SmartParsers.number(currentSampleIndex);
                action = () =>
                    this.templateBuilder.updateWell({
                        sample_index: idx === null ? undefined : idx - 1,
                    });
            } else {
                action = this.getShortcutAction(ev);
            }
            if (!action) return;
            ev.preventDefault();
            ev.stopPropagation();
            action?.();
        });
    }

    save = async () => {
        if (!this.bucket.name) {
            ToastService.error('Bucket name is required');
            return;
        }

        const bucket = { ...this.bucket, id: this.id };

        await BucketsApi.save(bucket);
        this.state.bucket.next(bucket);
        ToastService.success('Saved');
        window.history.replaceState(null, '', resolvePrefixedRoute(BucketsBreadcrumb.path!, bucket.id));
    };

    export = async () => {
        const data = writeBucket(this.bucket);
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
        <HStack gap={1}>
            <AsyncActionButton action={model.export} size='xs' colorPalette='blue' variant='subtle'>
                <LuDownload /> Export
            </AsyncActionButton>
            <AsyncActionButton action={model.save} size='xs' colorPalette='blue'>
                <LuSave /> Save
            </AsyncActionButton>
        </HStack>
    );
}

function EditBucket({ model }: { model: EditBucketModel }) {
    const bucket = useBehavior(model.state.bucket);

    return (
        <VStack gapY={2}>
            <Field label='Name' invalid={!bucket.name}>
                <SmartInput
                    placeholder='Bucket name'
                    value={bucket.name}
                    parse={SmartParsers.trim}
                    onChange={(name) => model.update({ name })}
                    index={0}
                    size='sm'
                />
            </Field>
            <Field label='Description'>
                <SmartInput
                    placeholder='Optional bucket description'
                    value={bucket.description}
                    parse={SmartParsers.trim}
                    onChange={(description) => model.update({ description })}
                    index={1}
                    size='sm'
                />
            </Field>
            <Field label='Project'>
                <SmartInput
                    placeholder='Optional project'
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
                    options={['per-kind', 'global', 'no']}
                    size='sm'
                />
            </Field>
            <LabwareEditor model={model} kind='source_labware' />
            <LabwareEditor model={model} kind='intermediate_labware' />
            <LabwareEditor model={model} kind='arp_labware' />

            <Field label='Template' />

            <ActionButtons model={model} />

            <Flex alignItems='flex-start' w='100%' gap={2}>
                <Box width='50%' minW='50%' maxW='50%' position='relative'>
                    <AspectRatio ratio={1.33}>
                        <PlateVisual model={model.plate} />
                    </AspectRatio>
                </Box>
                <VStack gap={1} flexGrow={1} alignItems='flex-start' overflowY='auto'>
                    <Text fontSize='md' fontWeight='bold'>
                        Indexing
                    </Text>
                    <SampleIndexing model={model} />

                    <Text fontSize='md' fontWeight='bold'>
                        Dilution Curve{' '}
                        <InfoTip>Curve applied to all sample kinds, can be overridden on per kind basis.</InfoTip>
                    </Text>

                    <SelectCurveButton model={model} curve={bucket.curve} />

                    <HStack gap={2}>
                        <Text fontSize='md' fontWeight='bold'>
                            Well Kinds
                        </Text>
                        <Button variant='ghost' size='xs' colorPalette='gray' onClick={model.sampleInfo.add}>
                            <LuCirclePlus /> Add
                        </Button>
                    </HStack>

                    <Table.Root size='sm' interactive>
                        <Table.Body w='full'>
                            {bucket.sample_info.map((info, index) => (
                                <SampleInfoControlsRow key={index} model={model} info={info} index={index} />
                            ))}
                        </Table.Body>
                    </Table.Root>

                    <Validation model={model} />
                </VStack>
            </Flex>
        </VStack>
    );
}

function SelectCurveButton({
    model,
    curve,
    info,
}: {
    model: EditBucketModel;
    curve?: DilutionCurve;
    info?: BucketSampleInfo;
}) {
    return (
        <Group attached>
            <AsyncActionButton
                variant='subtle'
                size='xs'
                colorPalette={curve ? 'purple' : info ? undefined : 'orange'}
                action={() => model.sampleInfo.selectCurve(info)}
                maxW={220}
                overflow='hidden'
                textOverflow='ellipsis'
                whiteSpace='nowrap'
                justifyContent='flex-start'
            >
                <LuChartNoAxesCombined /> {curve ? formatCurve(curve) : 'Select Curve'}
            </AsyncActionButton>
            {curve && (
                <Button
                    variant='outline'
                    size='xs'
                    colorPalette='purple'
                    onClick={() => showCurveDetails(curve)}
                    disabled={!curve}
                >
                    <FaMagnifyingGlass />
                </Button>
            )}
            {curve && (
                <Button
                    variant='outline'
                    size='xs'
                    colorPalette='purple'
                    onClick={() => downloadCurve(curve)}
                    disabled={!curve}
                >
                    <FaDownload />
                </Button>
            )}
        </Group>
    );
}

function Validation({ model }: { model: EditBucketModel }) {
    const { validation } = model;

    return (
        <HStack gap={2} w='full' alignItems='flex-start'>
            <Box flexGrow={1} flexShrink={0} flexBasis={0}>
                <Text fontSize='md' fontWeight='bold'>
                    Errors
                </Text>
                <Box overflow='hidden' overflowY='auto' maxH={100}>
                    {validation.errors.map((msg, i) => (
                        <Box key={i} color='red.500'>
                            {msg}
                        </Box>
                    ))}
                    {!validation.errors.length && (
                        <Box fontStyle='italic' color='gray.500'>
                            No errors
                        </Box>
                    )}
                </Box>
            </Box>
            <Box flexGrow={1} flexShrink={0} flexBasis={0}>
                <Text fontSize='md' fontWeight='bold'>
                    Warnings
                </Text>
                <Box overflow='hidden' overflowY='auto' maxH={100}>
                    {validation.warnings.map((msg, i) => (
                        <Box key={i} color='yellow.500'>
                            {msg}
                        </Box>
                    ))}
                    {!validation.errors.length && (
                        <Box fontStyle='italic' color='gray.500'>
                            No warnings
                        </Box>
                    )}
                </Box>
            </Box>
        </HStack>
    );
}

function TemplateShortcut({
    model,
    modifier,
    shortcut,
}: {
    model: EditBucketModel;
    modifier?: boolean;
    shortcut: string;
}) {
    const isPlateActive = useBehavior(model.plate.status.isActive);

    if (!isPlateActive) return null;
    return (
        <Kbd size='sm' position='absolute' top='0' transform='translateY(-120%)'>
            {modifier ? CtrlOrMeta : undefined}
            {modifier ? ' ' : undefined}+{shortcut}
        </Kbd>
    );
}

function ActionButtons({ model }: { model: EditBucketModel }) {
    const history = useBehavior(model.state.templateHistory);

    return (
        <HStack gap={2} alignItems='flex-start' justifyContent='center' w='full'>
            <Button variant='subtle' size='xs' onClick={model.templateBuilder.copy} pos='relative'>
                <FaCopy /> Copy
                <TemplateShortcut model={model} modifier shortcut='C' />
            </Button>
            <Button variant='subtle' size='xs' onClick={model.templateBuilder.paste} pos='relative'>
                <FaPaste /> Paste Exact
                <TemplateShortcut model={model} modifier shortcut='V' />
            </Button>
            <Button
                variant='subtle'
                size='xs'
                onClick={model.templateBuilder.pasteSmart}
                title='Automatically increment sample indices'
                pos='relative'
            >
                <FaPaste /> Paste Smart
                <TemplateShortcut model={model} modifier shortcut='Shift+V' />
            </Button>
            <Button variant='subtle' size='xs' onClick={model.templateBuilder.clear} pos='relative'>
                <MdOutlineBorderClear /> Clear Wells
                <TemplateShortcut model={model} modifier shortcut='X' />
            </Button>
            <Button
                variant='subtle'
                size='xs'
                onClick={model.templateBuilder.undo}
                disabled={history.length === 0}
                pos='relative'
            >
                <FaUndo /> Undo
                <TemplateShortcut model={model} modifier shortcut='Z' />
            </Button>
            <Box flexGrow={1} />
            <Button variant='subtle' size='xs' onClick={model.templateBuilder.export}>
                <FaFileExport /> Export Template CSV
            </Button>
        </HStack>
    );
}

function LabwareEditor({
    model,
    kind,
}: {
    model: EditBucketModel;
    kind: 'source_labware' | 'intermediate_labware' | 'arp_labware';
}) {
    const labware = model.bucket[kind];
    const w = '150px';
    let label: string;
    if (kind === 'source_labware') {
        label = 'Source Labware';
    } else if (kind === 'intermediate_labware') {
        label = 'Intermediate Labware';
    } else {
        label = 'ARP Labware';
    }
    return (
        <HStack gap={2} w='100%'>
            <Field label={label} minW={w} maxW={w}>
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
        const idx = SmartParsers.number(pointIndex.current!.value);
        model.templateBuilder.updateWell({
            point_index: idx === null ? undefined : idx - 1,
        });
        pointIndex.current!.value = '';
    };

    return (
        <>
            <HStack gap={1} alignItems='flex-start' w='100%'>
                <Group attached>
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
                    <Button variant='subtle' colorPalette='blue' size='xs' onClick={applySampleIndex} pos='relative'>
                        <FaEdit /> Set Sample Index
                        <TemplateShortcut model={model} shortcut='1-9* / Backspace' />
                    </Button>
                </Group>
            </HStack>

            <HStack gap={1} alignItems='flex-start'>
                <Group attached>
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

                    <Button
                        variant='subtle'
                        colorPalette='blue'
                        size='xs'
                        onClick={applyPointIndex}
                        alignContent='flex-start'
                    >
                        <FaEdit /> Set Point Index
                    </Button>
                </Group>

                <Button
                    variant='subtle'
                    colorPalette='blue'
                    size='xs'
                    onClick={model.templateBuilder.pointIndex}
                    pos='relative'
                >
                    <LuSignal /> Linear Point Index
                    <TemplateShortcut model={model} modifier shortcut='D' />
                </Button>
            </HStack>
        </>
    );
}

function SampleInfoControlsRow({
    model,
    info,
    index,
}: {
    model: EditBucketModel;
    info: BucketSampleInfo;
    index: number;
}) {
    const isPlateActive = useBehavior(model.plate.status.isActive);

    return (
        <Table.Row>
            <Table.Cell p={1} w={6}>
                <Button
                    colorPalette='blue'
                    variant='subtle'
                    size='xs'
                    onClick={() => model.templateBuilder.updateWell({ kind: info.kind })}
                >
                    <FaEdit />
                    {!isPlateActive && 'Apply'}
                    {isPlateActive && (
                        <Kbd size='sm'>
                            {CtrlOrMeta}+{index + 1}
                        </Kbd>
                    )}
                </Button>
            </Table.Cell>
            <Table.Cell>
                <Badge colorPalette='purple' variant='outline'>
                    {info.kind}
                </Badge>
            </Table.Cell>
            <Table.Cell p={1}>
                <HStack>
                    <Switch
                        size='xs'
                        checked={!!info.is_control}
                        onCheckedChange={(e) => model.sampleInfo.update(info, { is_control: e.checked })}
                        mx={1}
                    >
                        Control
                    </Switch>
                    {/* {info.is_control && (
                        <Box maxW='140px'>
                            <SmartInput
                                size='xs'
                                placeholder='Default Sample Id'
                                value={info.default_sample_id}
                                onChange={(v) =>
                                    model.sampleInfo.update(info, { default_sample_id: v?.trim() || undefined })
                                }
                            />
                        </Box>
                    )} */}
                </HStack>
            </Table.Cell>

            <Table.Cell p={1}>
                <SelectCurveButton model={model} curve={info.curve} info={info} />
            </Table.Cell>
            <Table.Cell textAlign='end' p={1}>
                <Button variant='plain' colorPalette='red' size='xs' onClick={() => model.sampleInfo.remove(info)}>
                    <LuTrash />
                </Button>
            </Table.Cell>
        </Table.Row>
    );
}

function SelectCurveDialog({
    model: options,
    state,
}: {
    model: [string, string][];
    state: BehaviorSubject<{ name: string | undefined; files: File[] }>;
}) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            {!!current.name && !current.files?.length && (
                <Alert.Root status='info'>
                    <Alert.Indicator />
                    <Alert.Title>
                        Selecting a curve will create a local copy for this bucket. If you modify the curve, you will
                        have to re-select it.
                    </Alert.Title>
                </Alert.Root>
            )}
            {current.files?.length === 0 && (
                <SimpleSelect
                    placeholder='Select curve...'
                    value={current.name}
                    allowEmpty
                    onChange={(v) => state.next({ ...current, name: v })}
                    options={options}
                />
            )}
            <FileDropArea onChange={(files) => state.next({ ...current, files })} extensions={['.json']} />
        </VStack>
    );
}

function AddWellKindDialog({ state }: { state: BehaviorSubject<string> }) {
    const current = useBehavior(state);
    return (
        <SmartInput
            size='sm'
            placeholder='Enter kind...'
            value={current}
            parse={(v) => v.replace(/[\s,;]+/g, '')}
            onChange={(v) => state.next(v)}
            autoFocus
        />
    );
}
