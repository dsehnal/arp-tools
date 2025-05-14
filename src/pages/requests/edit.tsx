import { DilutionCurve, formatCurve } from '@/lib/tools/model/curve';
import { PlateLayouts, PlateUtils } from '@/lib/tools/model/plate';
import { ProductionResult, ProductionPlate, ProductionTransfer } from '@/lib/tools/model/production';
import { ARPRequest, ARPRequestSample, ARPRequestStatusOptions, writeARPRequest } from '@/lib/tools/model/request';
import { getRequestSampleInfo, parseRequestSamplesCSV, validateRequestSample } from '@/lib/tools/request';
import { writePicklists, writeProductionZip } from '@/lib/tools/request/export';
import { buildRequest } from '@/lib/tools/request/production';
import { Field } from '@/components/ui/field';
import { AsyncWrapper } from '@/components/async-wrapper';
import { SmartInput, SmartParsers } from '@/components/input';
import { PlateModel, PlateVisual } from '@/components/plate';
import { SimpleSelect } from '@/components/select';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior, useBehaviorProp } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { download } from '@/lib/util/download';
import { memoizeLatest } from '@/lib/util/misc';
import { SingleAsyncQueue } from '@/lib/util/queue';
import { formatUnit } from '@/lib/util/units';
import { Alert, Badge, Box, Button, Flex, Group, HStack, Table, Tabs, Textarea, VStack } from '@chakra-ui/react';
import * as d3s from 'd3-scale-chromatic';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { LuChartNoAxesCombined, LuCirclePlus, LuTrash } from 'react-icons/lu';
import { useParams } from 'react-router';
import { BehaviorSubject, distinctUntilChanged, skip, throttleTime } from 'rxjs';
import { updateBucketTemplatePlate } from '../buckets/common';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { requestBreadcrumb, RequestsBreadcrumb } from './common';
import { writeCSV } from '@/lib/util/csv';
import { FaCopy, FaDownload } from 'react-icons/fa';
import { FileDropArea } from '@/components/file-upload';
import { BucketLabware } from '@/lib/tools/model/bucket';
import { FaMagnifyingGlass } from 'react-icons/fa6';
import { downloadCurve, showCurveDetails } from '../curves/common';

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

    private _sampleInfo = memoizeLatest(getRequestSampleInfo);
    get sampleInfo() {
        return this._sampleInfo(this.request);
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
        console.log(production);
        this.state.production.next(production);
    };

    addSamples = () => {
        DialogService.show({
            title: 'Add Samples',
            body: AddSamplesDialog,
            state: new BehaviorSubject({ csv: '', files: [] }),
            onOk: async (state: { csv: string; files: File[] }) => {
                if (state.files.length > 0) {
                    const file = state.files[0];
                    const text = await file.text();
                    this.applyAddSamples(text);
                } else {
                    this.applyAddSamples(state.csv);
                }
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

    private applyAddSamples(csv: string) {
        this.update({ samples: parseRequestSamplesCSV(this.bucket, csv) });
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
            <Button onClick={model.addSamples} size='xs' colorPalette='green' disabled={!model.canEdit}>
                <LuCirclePlus /> Add Samples
            </Button>
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
                        <Box key={`err${i}`} color='red.500'>
                            {e}
                        </Box>
                    ))}
                    {production?.errors.length === 0 && 'No errors'}
                    <Box fontWeight='bold'>Warnings</Box>
                    {production?.errors.map((e, i) => (
                        <Box key={`warn${i}`} color='yellow.500'>
                            {e}
                        </Box>
                    ))}
                    {production?.warnings.length === 0 && 'No warnings'}
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
    const [current, setCurrent] = useState('');
    const plate = production?.plates.find((p) => p.label === current);
    return (
        <Box w='full' h='full' display='flex' flexDirection='column' gap={2}>
            <SimpleSelect
                placeholder='Select plate...'
                value={current}
                allowEmpty
                onChange={setCurrent}
                options={options}
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

    return <Textarea flexGrow={1} style={{ fontFamily: 'monospace' }} value={picklist} readOnly />;
}

function PlateLabels({ model }: { model: EditRequestModel }) {
    const request = useBehavior(model.state.request);
    const { production } = model;

    if (!production) return <>Production not available</>;

    return (
        <VStack gap={2} w='full'>
            {production.plates.map((plate, idx) => (
                <Field label={plate.label} key={plate.label}>
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
                    />
                </Field>
            ))}
        </VStack>
    );
}

function BucketProperty({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Box fontWeight='bold' fontSize='xs' color='gray.500'>
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
                                {!bucket.curve && <Box color='gray.500'>No curve</Box>}
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
                        <Table.ColumnHeader></Table.ColumnHeader>
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
                                <Table.Cell textAlign='right' padding={1}>
                                    <Button
                                        size='xs'
                                        colorPalette='red'
                                        onClick={() => model.removeSample(s)}
                                        title='Remove'
                                        variant='subtle'
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
                <Box key={i} color={type === 'error' ? 'red.500' : type === 'warning' ? 'yellow.500' : 'blue.500'}>
                    {message}
                </Box>
            ))}
        </VStack>
    );
}

function AddSamplesDialog({ state }: { state: BehaviorSubject<{ csv: string; files: File[] }> }) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    Paste or drop a CSV file with <code>Sample ID, Kinds, Source Label, Source Well, Comment</code>{' '}
                    columns.
                    <code>Kinds</code> can be separated by whitespace.
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
