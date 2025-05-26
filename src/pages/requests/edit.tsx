import { AsyncWrapper } from '@/components/async-wrapper';
import { FileDropArea } from '@/components/file-upload';
import { SmartInput, SmartParsers } from '@/components/input';
import { PlateModel, PlateVisual } from '@/components/plate';
import { SimpleSelect } from '@/components/select';
import { Field } from '@/components/ui/field';
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from '@/components/ui/menu';
import { InfoTip } from '@/components/ui/toggle-tip';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior, useBehaviorProp } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { BucketLabware } from '@/lib/tools/model/bucket';
import { DilutionCurve, formatCurve } from '@/lib/tools/model/curve';
import { PlateLayouts, PlateUtils } from '@/lib/tools/model/plate';
import { ProductionPlate, ProductionResult, ProductionTransfer } from '@/lib/tools/model/production';
import { ARPRequest, ARPRequestSample, ARPRequestStatusOptions, writeARPRequest } from '@/lib/tools/model/request';
import {
    getRequestSampleInfo,
    parseRequestRackscanCSV,
    parseRequestSamplesCSV,
    validateRequestSample,
} from '@/lib/tools/request';
import { writePicklists, writeProductionZip } from '@/lib/tools/request/export';
import { buildRequest } from '@/lib/tools/request/production';
import { writeCSV } from '@/lib/util/csv';
import { download } from '@/lib/util/download';
import { memoizeLatest, splitString } from '@/lib/util/misc';
import { SingleAsyncQueue } from '@/lib/util/queue';
import { formatUnit } from '@/lib/util/units';
import { Alert, Badge, Box, Button, Code, Flex, Group, HStack, Table, Tabs, Textarea, VStack } from '@chakra-ui/react';
import * as d3s from 'd3-scale-chromatic';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FaCopy, FaDownload, FaFileImport } from 'react-icons/fa';
import { FaCirclePlus } from 'react-icons/fa6';
import { LuChartNoAxesCombined, LuChevronDown, LuPencil, LuTrash } from 'react-icons/lu';
import { useParams } from 'react-router';
import { BehaviorSubject, distinctUntilChanged, skip, throttleTime } from 'rxjs';
import { updateBucketTemplatePlate } from '../buckets/common';
import { downloadCurve, showCurveDetails } from '../curves/common';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { requestBreadcrumb, RequestsBreadcrumb } from './common';

class EditRequestModel extends ReactiveModel {
    state = {
        request: new BehaviorSubject<ARPRequest>(undefined as any),
        production: new BehaviorSubject<ProductionResult | undefined>(undefined),
    };

    plate = new PlateModel(PlateLayouts[384]);

    get canEdit() {
        return this.request.status === 'new' || this.request.status === 'in-progress';
    }

    get request() {
        return this.state.request.value;
    }

    get bucket() {
        return this.request.bucket;
    }

    get production() {
        return this.state.production.value;
    }

    get defaultKind() {
        return this.bucket.sample_info.find((s) => !s.is_control)?.kind;
    }

    private _sampleInfo = memoizeLatest(getRequestSampleInfo);
    get sampleInfo() {
        return this._sampleInfo(this.request);
    }

    private _sampleKindOptions = memoizeLatest((req: ARPRequest) => {
        return req.bucket.sample_info.map((s) => [s.kind, s.kind] as [string, string]);
    });
    get sampleKindOptions() {
        return this._sampleKindOptions(this.request);
    }

    private _productionValidation = memoizeLatest((_: ARPRequest, production?: ProductionResult) => {
        const seenPlateLabels = new Set<string>();
        const isDuplicatePlateLabel = new Set<string>();

        if (!production) {
            return { isDuplicatePlateLabel };
        }

        const { request } = this;

        for (const plate of production.plates) {
            const label = request.production.plate_labels?.[plate.label];
            if (!label) continue;

            if (seenPlateLabels.has(label)) {
                isDuplicatePlateLabel.add(plate.label);
            } else {
                seenPlateLabels.add(label);
            }
        }

        return { isDuplicatePlateLabel };
    });
    get productionValidation() {
        return this._productionValidation(this.request, this.production);
    }

    update(next: Partial<ARPRequest>) {
        this.state.request.next({ ...this.request, ...next });
    }

    private saveQueue = new SingleAsyncQueue();
    save = () => {
        if (!this.request) return;
        this.saveQueue.run(async () => {
            try {
                await RequestsApi.save(this.request);
                ToastService.success('Saved', { id: 'save', duration: 500 });
            } catch (e) {
                console.error(e);
                ToastService.error('Error saving request', { id: 'save' });
            }
        });
    };

    copyLabels = () => {
        if (!this.production) return;

        const labels = this.request.production.plate_labels;
        const rows = [['Request Name', 'Plate', 'Label']];
        for (const plate of this.production.plates) {
            const label = labels?.[plate.label] || '';
            rows.push([this.request.name, plate.label, label]);
        }

        const csv = writeCSV(rows, '\t');
        try {
            window.navigator.clipboard.writeText(csv);
            ToastService.success('Copied to clipboard', { id: 'copy-labels' });
        } catch (e) {
            console.error(e);
            ToastService.error('Error copying labels to clipboard', { id: 'copy-labels' });
        }
    };

    download = () => {
        if (!this.production) return;

        const data = writeProductionZip(this.request, this.production);
        download(data, `request-${this.request.name || this.request.id || Date.now()}.zip`);
    };

    export = async () => {
        const data = writeARPRequest(this.request);
        download(
            new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
            `request-${this.request.name || this.request.id || Date.now()}.json`
        );
    };

    produce = async () => {
        const production = buildRequest(this.request);
        this.state.production.next(production);
    };

    importSamples = () => {
        DialogService.show({
            title: 'Import Samples',
            body: ImportSamplesDialog,
            state: new BehaviorSubject({ csv: '', files: [] }),
            model: this,
            onOk: async (state: { csv: string; files: File[] }) => {
                if (state.files.length > 0) {
                    const file = state.files[0];
                    const text = await file.text();
                    this.applyImportSamples(text);
                } else {
                    this.applyImportSamples(state.csv);
                }
            },
        });
    };

    importRackscan = () => {
        DialogService.show({
            title: 'Import Rackscan',
            body: ImportRackscanDialog,
            state: new BehaviorSubject({ csv: '', files: [] }),
            onOk: async (state: { csv: string; files: File[] }) => {
                if (state.files.length > 0) {
                    const file = state.files[0];
                    const text = await file.text();
                    this.applyImportRackScan(text);
                } else {
                    this.applyImportRackScan(state.csv);
                }
            },
        });
    };

    addSamples = () => {
        DialogService.show({
            title: 'Add Samples',
            body: EditSampleDialog,
            state: new BehaviorSubject<ARPRequestSample>({
                id: '',
                kinds: [],
                comment: '',
                source_label: '',
                source_well: '',
            }),
            model: {
                model: this,
                isNew: true,
            },
            onOk: async (state: ARPRequestSample) => {
                const ids = splitString(state.id);
                if (ids.length === 0) throw new Error('No sample IDs provided');

                const defaultKind = this.bucket.sample_info.find((s) => !s.is_control)?.kind;
                const defaultKinds = defaultKind ? [defaultKind] : [];
                const kinds = state.kinds.length > 0 ? state.kinds : defaultKinds;

                const samples: ARPRequestSample[] = ids.map((id) => ({
                    ...state,
                    id: id.trim(),
                    kinds,
                }));

                this.update({
                    samples: [...this.request.samples, ...samples],
                });
            },
        });
    };

    editSample(index: number) {
        DialogService.show({
            title: 'Edit Sample',
            body: EditSampleDialog,
            state: new BehaviorSubject<ARPRequestSample>(this.request.samples[index]),
            model: { model: this },
            onOk: async (state: ARPRequestSample) => {
                const defaultKind = this.bucket.sample_info.find((s) => !s.is_control)?.kind;
                const defaultKinds = defaultKind ? [defaultKind] : [];
                const kinds = state.kinds.length > 0 ? state.kinds : defaultKinds;

                const samples = [...this.request.samples];
                samples[index] = {
                    ...state,
                    kinds,
                };

                this.update({ samples });
            },
        });
    }

    clearSamples = () => {
        DialogService.confirm({
            title: 'Remove Sample',
            message: `Are you sure you want to remove all samples?`,
            onOk: async () => {
                this.update({ samples: [] });
            },
        });
    };

    removeSample(sample: ARPRequestSample) {
        DialogService.confirm({
            title: 'Remove Sample',
            message: `Are you sure you want to remove ${sample.id}?`,
            onOk: async () => {
                const samples = this.request.samples.filter((s) => s !== sample);
                this.update({ samples });
            },
        });
    }

    private applyImportSamples(csv: string) {
        this.update({
            samples: [...this.request.samples, ...parseRequestSamplesCSV(this.bucket, csv)],
        });
    }

    private applyImportRackScan(csv: string) {
        const rackscan = parseRequestRackscanCSV(csv);
        const mapping = new Map(rackscan.map((s) => [s.sample_id, s]));

        const samples = this.request.samples.map((s) => {
            const rack = mapping.get(s.id);
            if (!rack) return s;

            return {
                ...s,
                source_label: rack.source_label,
                source_well: rack.source_well,
            };
        });

        this.update({ samples });
    }

    async init() {
        const req = await RequestsApi.get(this.id);
        if (!req) {
            throw new Error('Request not found');
        }

        this.state.request.next(req);
        updateBucketTemplatePlate(this.plate, req.bucket);
    }

    mount() {
        this.subscribe(
            this.state.request.pipe(
                distinctUntilChanged((a, b) => a.samples === b.samples && a.n_copies === b.n_copies)
            ),
            () => {
                this.produce();
            }
        );

        this.subscribe(
            this.state.request.pipe(skip(1), throttleTime(500, undefined, { leading: false, trailing: true })),
            () => {
                this.save();
            }
        );
    }

    constructor(public id: string) {
        super();
    }
}

async function createModel(id: string) {
    const model = new EditRequestModel(id);
    await model.init();
    return model;
}

export function EditRequestUI() {
    const { id } = useParams();
    const { model, loading, error } = useAsyncModel(createModel, id);

    return (
        <Layout
            breadcrumbs={[
                RequestsBreadcrumb,
                requestBreadcrumb({ isLoading: loading, name: <Breadcrumb model={model} />, id: model?.id }),
            ]}
            buttons={!!model && <NavButtons model={model} />}
            contentPadding={0}
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <EditRequest model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function Breadcrumb({ model }: { model?: EditRequestModel }) {
    const req = useBehavior(model?.state.request);
    if (!req) return <>Loading...</>;
    return (
        <>
            <span>{req.name || 'Unnamed Request'}</span>
            <span>
                [Bucket: {req.bucket.name}, Project: {req.bucket.project || 'n/a'}]
            </span>
        </>
    );
}

function NavButtons({ model }: { model: EditRequestModel }) {
    useBehavior(model.state.request);
    return (
        <HStack gap={1}>
            <Button size='xs' colorPalette='green' variant='subtle' onClick={model.importRackscan}>
                <FaFileImport /> Rackscan
            </Button>
            <MenuRoot>
                <MenuTrigger asChild>
                    <Button size='xs' colorPalette='green'>
                        Samples <LuChevronDown />
                    </Button>
                </MenuTrigger>
                <MenuContent>
                    <MenuItem value='add' onClick={model.addSamples}>
                        <FaCirclePlus /> Add
                    </MenuItem>
                    <MenuItem value='import' onClick={model.importSamples}>
                        <FaFileImport /> Import CSV
                    </MenuItem>
                </MenuContent>
            </MenuRoot>
        </HStack>
    );
}

function EditRequest({ model }: { model: EditRequestModel }) {
    useReactiveModel(model);
    return (
        <Tabs.Root defaultValue='samples' display='flex' flexDirection='column' height='full'>
            <Tabs.List>
                <Tabs.Trigger value='samples'>Samples</Tabs.Trigger>
                <Tabs.Trigger value='bucket'>Bucket</Tabs.Trigger>
                <Tabs.Trigger value='production'>Production</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content position='relative' value='samples' flexGrow={1} p={2}>
                <SamplesTab model={model} />
            </Tabs.Content>
            <Tabs.Content position='relative' value='bucket' flexGrow={1} p={2}>
                <BucketTab model={model} />
            </Tabs.Content>
            <Tabs.Content position='relative' value='production' flexGrow={1} p={2}>
                <ProductionTab model={model} />
            </Tabs.Content>
        </Tabs.Root>
    );
}

function SamplesTab({ model }: { model: EditRequestModel }) {
    return (
        <HStack h='100%' position='relative' gap={2}>
            <SampleTable model={model} />
            <Flex gap={2} minW={400} maxW={400} w={400} flexDirection='column' h='100%'>
                <Box flexGrow={1} position='relative'>
                    <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll'>
                        <EditOptions model={model} />
                    </Box>
                </Box>
            </Flex>
        </HStack>
    );
}

function BucketTab({ model }: { model: EditRequestModel }) {
    return <BucketInfo model={model} />;
}

function ProductionTab({ model }: { model: EditRequestModel }) {
    const production = useBehavior(model.state.production);

    return (
        <HStack h='100%' position='relative' gap={2}>
            <Flex gap={2} minW={300} maxW={300} w={300} flexDirection='column' h='100%' position='relative'>
                <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll'>
                    <Box fontWeight='bold'>Errors</Box>
                    {production?.errors.map((e, i) => (
                        <Box key={`err${i}`} color='fg.error'>
                            {e}
                        </Box>
                    ))}
                    {production?.errors.length === 0 && <Box color='fg.subtle'>No errors</Box>}
                    <Box fontWeight='bold'>Warnings</Box>
                    {production?.warnings.map((e, i) => (
                        <Box key={`warn${i}`} color='fg.warning'>
                            {e}
                        </Box>
                    ))}
                    {production?.warnings.length === 0 && <Box color='fg.subtle'>No warnings</Box>}
                </Box>
            </Flex>
            <ProductionPlates model={model} />
            <Flex gap={2} minW={400} maxW={400} w={400} flexDirection='column' h='100%' position='relative'>
                {production && (
                    <Button onClick={model.download} size='sm' colorPalette='purple' variant='solid'>
                        <FaDownload /> Download Picklists and Platemaps
                    </Button>
                )}
                {production && (
                    <Button onClick={model.copyLabels} size='sm' colorPalette='blue' variant='subtle'>
                        <FaCopy /> Copy Labels
                    </Button>
                )}
                <Flex grow={1} pos='relative'>
                    <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll'>
                        <PlateLabels model={model} />
                    </Box>
                </Flex>
            </Flex>
        </HStack>
    );
}

function ProductionPlates({ model }: { model: EditRequestModel }) {
    const { production } = model;
    const options = useMemo(
        () => production?.plates.map((p) => [p.label, p.label] as [string, string]) ?? [],
        [production]
    );
    const [current, setCurrent] = useState('') as [string, (v: string) => void];
    useEffect(() => {
        const arp = production?.plates.find((p) => p.kind === 'arp');
        setCurrent(arp?.label || production?.plates[0]?.label || '');
    }, [production]);
    const plate = production?.plates.find((p) => p.label === current);
    return (
        <Box w='full' h='full' display='flex' flexDirection='column' gap={2}>
            <SimpleSelect
                placeholder='Select plate...'
                value={current}
                allowEmpty
                onChange={setCurrent}
                options={options}
                size='sm'
            />
            <CurrentPlateVisual model={model} plate={plate} />
            <PlatePicklist model={model} plate={plate} />
        </Box>
    );
}

function CurrentPlateVisual({ model, plate }: { model: EditRequestModel; plate?: ProductionPlate }) {
    const plateModel = useRef<PlateModel>(null);
    if (!plateModel.current) {
        plateModel.current = new PlateModel(plate?.plate.dimensions ?? PlateLayouts[384]);
    }

    useEffect(() => {
        if (!plate) {
            plateModel.current!.update({ labels: [], colors: [] });
            return;
        }
        if (plate.kind === 'arp') {
            updateBucketTemplatePlate(plateModel.current!, model.request.bucket, plate);
        } else {
            plateModel.current!.update({
                colors: plate.plate.wells.map((w, idx) => {
                    if (!w) return undefined;
                    if (!w.concentration_m) return 'lightblue';
                    return d3s.interpolateCividis(idx / plate.plate.wells.length);
                }),
                labels: plate.plate.wells.map((w) => {
                    return w?.sample_id;
                }),
            });
        }
    }, [plate, model]);

    return (
        <Box>
            <Box pos='relative' h='300px' w='full'>
                <PlateVisual model={plateModel.current} />
            </Box>
            <Box textAlign='right' fontSize='smaller'>
                <CurrentPlateLabel model={model} plate={plate} visual={plateModel.current} />
            </Box>
        </Box>
    );
}

function formatTransfer(t: ProductionTransfer) {
    const r = formatUnit(t.volume_l, 'L', { compact: true });
    if (!t.concentration_m) return `${r} solvent`;
    return `${r}@${formatUnit(t.concentration_m, 'M', { compact: true })}`;
}

function CurrentPlateLabel({
    plate,
    visual,
}: {
    model: EditRequestModel;
    plate?: ProductionPlate;
    visual: PlateModel;
}) {
    const selection = useBehaviorProp(visual?.state, (s) => s.selection);
    const idx = PlateUtils.firstSelectedIndex(selection);
    const well = plate?.plate.wells[idx!];

    if (typeof idx !== 'number') return <>Nothing Selected</>;

    const label = PlateUtils.rowMajorWellIndexToLabel(visual.dimensions, idx);
    if (!well) return <>{label}</>;

    return (
        <>
            {label}: {well.sample_id} {formatUnit(well.volume_l, 'L', { compact: true })}@
            {formatUnit(well.concentration_m, 'M', { compact: true })} [{well.transfers.map(formatTransfer).join(', ')}]
        </>
    );
}

function PlatePicklist({ model, plate }: { model: EditRequestModel; plate?: ProductionPlate }) {
    const request = useBehavior(model.state.request);
    const picklist = useMemo(
        () => (plate ? writePicklists(model.request, [plate]) : ''),
        [model, request.production.plate_labels, plate]
    );

    return <Textarea flexGrow={1} style={{ fontFamily: 'monospace' }} value={picklist} readOnly whiteSpace='pre' />;
}

function PlateLabels({ model }: { model: EditRequestModel }) {
    const request = useBehavior(model.state.request);
    const { production, bucket } = model;

    const stats = useMemo(
        () => ({
            sourcePlates: production?.plates.filter((p) => p.kind !== 'arp'),
            arpPlates: production?.plates.filter((p) => p.kind === 'arp'),
            nARPPlates: production?.plates.filter((p) => p.kind === 'arp' && p.copy === 0).length,
        }),
        [production]
    );

    if (!production) return <>Production not available</>;

    const validation = model.productionValidation;

    const renderPlate = (plate: ProductionPlate, idx: number) => (
        <Field
            key={plate.label}
            invalid={validation.isDuplicatePlateLabel.has(plate.label)}
            errorText={validation.isDuplicatePlateLabel.has(plate.label) ? 'Duplicate plate label' : undefined}
            label={
                <Flex gap={2}>
                    <Box fontWeight='bold'>{plate.label}</Box>
                    <Box fontSize='smaller' color='fg.subtle'>
                        {plate.kind === 'source' && (
                            <>
                                {PlateUtils.size(bucket.source_labware.dimensions)} well{' '}
                                {bucket.source_labware.shorthand}
                            </>
                        )}
                        {plate.kind === 'intermediate' && (
                            <>
                                {PlateUtils.size(bucket.intermediate_labware.dimensions)} well{' '}
                                {bucket.intermediate_labware.shorthand}
                            </>
                        )}
                        {plate.kind === 'arp' && (
                            <>
                                {PlateUtils.size(bucket.arp_labware.dimensions)} well {bucket.arp_labware.shorthand}
                            </>
                        )}
                    </Box>
                </Flex>
            }
        >
            <SmartInput
                placeholder='Enter label...'
                value={request.production.plate_labels?.[plate.label] ?? ''}
                parse={SmartParsers.trim}
                onChange={(v) =>
                    model.update({
                        production: {
                            ...request.production,
                            plate_labels: {
                                ...request.production.plate_labels,
                                [plate.label]: v || undefined,
                            },
                        },
                    })
                }
                index={idx}
                indexGroup='plate-barcodes'
                size='sm'
                selectOnFocus
            />
        </Field>
    );

    return (
        <VStack gap={2} w='full'>
            {stats.sourcePlates?.map(renderPlate)}
            <Box fontSize='small' fontWeight='bold'>
                {stats.nARPPlates} ARP Plate{stats.nARPPlates === 1 ? '' : 's'}, {request.n_copies}{' '}
                {request.n_copies === 1 ? 'copy' : 'copies'}
            </Box>
            {stats.arpPlates?.map((p, i) => renderPlate(p, i + (stats.sourcePlates?.length ?? 0)))}
        </VStack>
    );
}

function BucketProperty({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Box fontWeight='bold' fontSize='xs' color='fg.subtle'>
                {label}
            </Box>
            <Box>{children}</Box>
        </Box>
    );
}

function BucketLabwareInfo({ labware }: { labware: BucketLabware }) {
    return (
        <>
            {PlateUtils.size(labware.dimensions)} wells,
            {formatUnit(labware.dead_volume_l, 'L', { compact: true })}/
            {formatUnit(labware.well_volume_l, 'L', { compact: true })} dead/well volume,
            {labware.name || '<not named>'} {!!labware.shorthand && `(${labware.shorthand})`}
        </>
    );
}

function CurveInfo({ curve }: { curve?: DilutionCurve }) {
    if (!curve) return null;
    return (
        <Group attached>
            <Button
                variant='outline'
                size='xs'
                colorPalette='blue'
                maxW={420}
                overflow='hidden'
                textOverflow='ellipsis'
                whiteSpace='normal'
                onClick={() => showCurveDetails(curve)}
            >
                <LuChartNoAxesCombined /> {formatCurve(curve)}
            </Button>
            <Button
                variant='outline'
                size='xs'
                colorPalette='blue'
                onClick={() => downloadCurve(curve)}
                disabled={!curve}
            >
                <FaDownload />
            </Button>
        </Group>
    );
}

function BucketInfo({ model }: { model: EditRequestModel }) {
    const { request } = model;
    const { bucket } = request;

    return (
        <Flex gap={2} mb={2} flexDirection='column' h='full'>
            <Box pos='relative' h='300px' w='full'>
                <PlateVisual model={model.plate} />
            </Box>

            <Box flexGrow={1} pos='relative'>
                <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll'>
                    <Flex gap={2}>
                        <Flex flexGrow={1} flexDirection='column'>
                            <BucketProperty label='Name'>{bucket.name}</BucketProperty>
                            <BucketProperty label='Project'>{bucket.project || 'n/a'}</BucketProperty>
                            <BucketProperty label='Description'>{bucket.description || 'n/a'}</BucketProperty>
                            <BucketProperty label='Source Labware'>
                                <BucketLabwareInfo labware={bucket.source_labware} />
                            </BucketProperty>
                            <BucketProperty label='Intermediate Labware'>
                                <BucketLabwareInfo labware={bucket.intermediate_labware} />
                            </BucketProperty>
                            <BucketProperty label='ARP Labware'>
                                <BucketLabwareInfo labware={bucket.arp_labware} />
                            </BucketProperty>
                        </Flex>
                        <Flex flexGrow={1} gap={1} flexDirection='column'>
                            <BucketProperty label='Curve'>
                                {!!bucket.curve && <CurveInfo curve={bucket.curve} />}
                                {!bucket.curve && <Box color='fg.subtle'>No curve</Box>}
                            </BucketProperty>
                            <BucketProperty label='Well Kinds'>
                                <Flex gap={1} flexDirection='column'>
                                    {request.bucket.sample_info.map((s) => (
                                        <HStack key={s.kind} gap={2}>
                                            <Badge colorPalette='blue'>{s.kind}</Badge>
                                            {s.is_control ? <Badge>Control</Badge> : undefined}
                                            <CurveInfo curve={s.curve} />
                                        </HStack>
                                    ))}
                                </Flex>
                            </BucketProperty>
                        </Flex>
                    </Flex>
                </Box>
            </Box>
        </Flex>
    );
}

function EditOptions({ model }: { model: EditRequestModel }) {
    const req = useBehavior(model.state.request);
    const { canEdit } = model;
    let idx = 0;

    return (
        <VStack gap={1}>
            <Field label='Request Name'>
                <SmartInput
                    placeholder='Enter Name...'
                    value={req.name}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ name: v })}
                    index={idx++}
                    size='sm'
                    disabled={!canEdit}
                />
            </Field>

            <Field label='Number of Copies'>
                <SmartInput
                    value={req.n_copies}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ n_copies: v })}
                    index={idx++}
                    size='sm'
                    disabled={!canEdit}
                />
            </Field>

            <Field label='Description'>
                <SmartInput
                    placeholder='Enter Description...'
                    value={req.description}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ description: v })}
                    index={idx++}
                    size='sm'
                    disabled={!canEdit}
                />
            </Field>
            <Field label='Status'>
                <SimpleSelect
                    value={req.status}
                    options={ARPRequestStatusOptions}
                    onChange={(v) => model.update({ status: v as any })}
                />
            </Field>
        </VStack>
    );
}

function SampleTable({ model }: { model: EditRequestModel }) {
    const req = useBehavior(model.state.request);
    const { canEdit } = model;

    let sampleIndex = 0;
    const infos = new Map(req.bucket.sample_info.map((s) => [s.kind, s]));

    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader></Table.ColumnHeader>
                        <Table.ColumnHeader>Sample ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Validation</Table.ColumnHeader>
                        <Table.ColumnHeader>Source Label</Table.ColumnHeader>
                        <Table.ColumnHeader>Source Well</Table.ColumnHeader>
                        <Table.ColumnHeader>Kinds</Table.ColumnHeader>
                        <Table.ColumnHeader>Comment</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign='right' p={1}>
                            <Button
                                size='2xs'
                                colorPalette='red'
                                onClick={model.clearSamples}
                                title='Remove All'
                                variant='subtle'
                                disabled={!canEdit}
                            >
                                <LuTrash />
                            </Button>
                        </Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {req.samples.map((s, i) => {
                        let isControl = true;
                        for (const kind of s.kinds) {
                            const info = infos.get(kind);
                            if (!info?.is_control) {
                                isControl = false;
                                break;
                            }
                        }
                        if (!isControl) sampleIndex++;
                        return (
                            <Table.Row key={i}>
                                <Table.Cell>{!isControl ? sampleIndex : undefined}</Table.Cell>
                                <Table.Cell>{s.id}</Table.Cell>
                                <Table.Cell>
                                    <SampleValidation model={model} sample={s} />
                                </Table.Cell>
                                <Table.Cell>{s.source_label}</Table.Cell>
                                <Table.Cell>{s.source_well}</Table.Cell>
                                <Table.Cell>
                                    <HStack gap={1}>
                                        {s.kinds.map((k) => (
                                            <Badge key={k} colorPalette='blue'>
                                                {k}
                                            </Badge>
                                        ))}
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>{s.comment}</Table.Cell>
                                <Table.Cell textAlign='right' p={1}>
                                    <Button
                                        size='2xs'
                                        colorPalette='blue'
                                        variant='subtle'
                                        title='Edit'
                                        onClick={() => model.editSample(i)}
                                    >
                                        <LuPencil />
                                    </Button>
                                    <Button
                                        size='2xs'
                                        colorPalette='red'
                                        onClick={() => model.removeSample(s)}
                                        title='Remove'
                                        variant='subtle'
                                        ms={1}
                                        disabled={!canEdit}
                                    >
                                        <LuTrash />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

function SampleValidation({ model, sample }: { model: EditRequestModel; sample: ARPRequestSample }) {
    const validation = useMemo(
        () => validateRequestSample(sample, model.sampleInfo),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [model, sample, model.request.samples]
    );

    return (
        <VStack gap={1}>
            {validation.map(([type, message], i) => (
                <Box key={i} color={type === 'error' ? 'fg.error' : type === 'warning' ? 'fg.warning' : 'fg.info'}>
                    {message}
                </Box>
            ))}
        </VStack>
    );
}

function ImportSamplesDialog({
    state,
    model,
}: {
    state: BehaviorSubject<{ csv: string; files: File[] }>;
    model: EditRequestModel;
}) {
    const current = useBehavior(state);
    const { defaultKind } = model;
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    <Box>Paste or drop a CSV file</Box>
                    <Box as='ul' listStyleType='circle' ms={4}>
                        <li>
                            <Code variant='outline'>Sample ID, Kinds, Source Label, Source Well, Comment</Code>
                            columns
                        </li>
                        <li>
                            <Code variant='outline'>Kinds, Source Label, Source Well, Comment</Code> are optional
                        </li>
                        <li>
                            <Code variant='outline'>Kinds</Code> can be separated by whitespace, if unset{' '}
                            <b>{defaultKind}</b> is assigned automatically
                        </li>
                    </Box>
                </Alert.Title>
            </Alert.Root>
            {current.files?.length === 0 && (
                <Textarea
                    value={current.csv}
                    style={{ fontFamily: 'monospace' }}
                    onChange={(e) => state.next({ csv: e.target.value, files: [] })}
                    rows={7}
                    autoFocus
                />
            )}
            <FileDropArea onChange={(files) => state.next({ ...current, files })} extensions={['.csv']} />
        </VStack>
    );
}

function ImportRackscanDialog({ state }: { state: BehaviorSubject<{ csv: string; files: File[] }> }) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    Paste or drop a CSV file
                    <Box as='ul' listStyleType='circle' ms={4}>
                        <li>
                            <Code variant='outline'>Sample ID, Source Label, Source Well</Code>
                            columns
                        </li>
                    </Box>
                </Alert.Title>
            </Alert.Root>
            {current.files?.length === 0 && (
                <Textarea
                    value={current.csv}
                    style={{ fontFamily: 'monospace' }}
                    onChange={(e) => state.next({ csv: e.target.value, files: [] })}
                    rows={7}
                    autoFocus
                />
            )}
            <FileDropArea onChange={(files) => state.next({ ...current, files })} extensions={['.csv']} />
        </VStack>
    );
}

function EditSampleDialog({
    state,
    model: { model, isNew },
}: {
    state: BehaviorSubject<ARPRequestSample>;
    model: { model: EditRequestModel; isNew?: boolean };
}) {
    const current = useBehavior(state);
    const { defaultKind } = model;

    return (
        <VStack gap={2}>
            <Field
                label={
                    isNew ? (
                        <>
                            Sample IDs <InfoTip>Can be a whitespace/comma separated list</InfoTip>
                        </>
                    ) : (
                        'Sample ID'
                    )
                }
            >
                <SmartInput
                    value={current.id}
                    parse={SmartParsers.trim}
                    onChange={(v) => state.next({ ...current, id: v })}
                    size='sm'
                    disabled={!isNew}
                    index={0}
                    multiline={isNew}
                    autoFocus
                />
            </Field>
            <Field label='Kinds'>
                <SimpleSelect
                    value={current.kinds}
                    options={model.sampleKindOptions}
                    onChange={(v) => state.next({ ...current, kinds: v })}
                    size='sm'
                    placeholder={defaultKind || 'Select kind...'}
                    multiple
                />
            </Field>
            <Field label='Comment'>
                <SmartInput
                    value={current.comment}
                    parse={SmartParsers.trim}
                    onChange={(v) => state.next({ ...current, comment: v || undefined })}
                    size='sm'
                    index={3}
                />
            </Field>
            {!isNew && (
                <Field label='Source Label'>
                    <SmartInput
                        value={current.source_label}
                        parse={SmartParsers.trim}
                        onChange={(v) => state.next({ ...current, source_label: v || undefined })}
                        size='sm'
                        index={1}
                    />
                </Field>
            )}
            {!isNew && (
                <Field label='Source Well'>
                    <SmartInput
                        value={current.source_well}
                        parse={SmartParsers.trim}
                        onChange={(v) => state.next({ ...current, source_well: v || undefined })}
                        size='sm'
                        index={2}
                    />
                </Field>
            )}
        </VStack>
    );
}
