import { Field } from '@/components/ui/field';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { SmartInput, SmartParsers } from '@/lib/components/input';
import { SimpleSelect } from '@/lib/components/select';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { PlateModel, PlateVisual } from '@/lib/components/plate';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { formatCurve } from '@/model/curve';
import { PlateLayouts } from '@/model/plate';
import { ARPRequest, ARPRequestSample, ARPRequestStatusOptions } from '@/model/request';
import { Alert, Box, Button, Flex, HStack, Table, Textarea, VStack } from '@chakra-ui/react';
import Papa from 'papaparse';
import { useParams } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { updateBucketTemplatePlate } from '../buckets/common';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { requestBreadcrumb, RequestsBreadcrumb } from './common';
import { ToastService } from '@/lib/services/toast';
import { AsyncActionButton } from '@/lib/components/button';
import { LuCirclePlus, LuCombine, LuDownload, LuSave, LuTrash } from 'react-icons/lu';

class EditRequestModel extends ReactiveModel {
    state = {
        request: new BehaviorSubject<ARPRequest>(undefined as any),
    };

    plate = new PlateModel(PlateLayouts[384]);

    get request() {
        return this.state.request.value;
    }

    update(next: Partial<ARPRequest>) {
        this.state.request.next({ ...this.request, ...next });
    }

    save = async () => {
        if (!this.request) return;
        await RequestsApi.save(this.request);
        ToastService.success('Saved');
    };

    export = async () => {
        alert('TODO');
    };

    produce = async () => {
        alert('TODO');
    };

    addSamples = () => {
        DialogService.show({
            title: 'Add Samples',
            body: AddSamplesDialog,
            state: new BehaviorSubject({ csv: '' }),
            onOk: async (state: { csv: string }) => {
                this.applyAddSamples(state.csv);
            },
        });
    };

    private applyAddSamples(csv: string) {
        const data = Papa.parse(csv.replace(/\t/g, ','), { header: true, delimiter: ',' });

        const idField = data.meta.fields?.find((f) => f.toLowerCase() === 'sample id');
        if (!idField) {
            throw new Error('Missing Sample ID column');
        }

        const defaultKind = this.request.bucket.sample_info.find((s) => !s.is_control)?.kind;
        const kindField = data.meta.fields?.find((f) => f.toLowerCase() === 'kind');

        const samples = data.data
            .filter((row: any) => row[idField])
            .map(
                (row: any) =>
                    ({
                        id: row[idField],
                        kind: row[kindField!]?.trim() || defaultKind,
                    }) satisfies ARPRequestSample
            );

        this.update({ samples: [...this.request.samples, ...samples] });
    }

    async init() {
        const req = await RequestsApi.get(this.id);
        if (!req) {
            throw new Error('Request not found');
        }

        this.state.request.next(req);
        updateBucketTemplatePlate(this.plate, req.bucket);
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
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <EditRequest model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function Breadcrumb({ model }: { model?: EditRequestModel }) {
    const req = useBehavior(model?.state.request);
    return req?.name || 'Unnamed Request';
}

function NavButtons({ model }: { model: EditRequestModel }) {
    return (
        <HStack gap={2}>
            <Button onClick={model.addSamples} size='xs' colorPalette='green'>
                <LuCirclePlus /> Add Samples
            </Button>
            <AsyncActionButton action={model.save} size='xs' colorPalette='blue'>
                <LuSave /> Save
            </AsyncActionButton>
            <AsyncActionButton action={model.export} size='xs' colorPalette='blue'>
                <LuDownload /> Export
            </AsyncActionButton>
            <AsyncActionButton action={model.produce} size='xs' colorPalette='purple'>
                <LuCombine /> Produce
            </AsyncActionButton>
        </HStack>
    );
}

function EditRequest({ model }: { model: EditRequestModel }) {
    useReactiveModel(model);
    return (
        <HStack h='100%' position='relative' gap={2}>
            <SampleTable model={model} />
            <Flex gap={2} minW={400} maxW={400} w={400} flexDirection='column' h='100%'>
                <Box flexGrow={1} position='relative'>
                    <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll' pe={2}>
                        <BucketInfo model={model} />
                        <EditOptions model={model} />
                    </Box>
                </Box>
            </Flex>
        </HStack>
    );
}

function BucketInfo({ model }: { model: EditRequestModel }) {
    const req = model.request;

    return (
        <VStack gap={1} mb={2} alignItems='flex-start'>
            <Box>
                <b>Bucket:</b> {req.bucket.name}
            </Box>
            <Box pos='relative' h='300px' w='full'>
                <PlateVisual model={model.plate} />
            </Box>
            <Box fontWeight='bold'>Sample Kinds</Box>
            {req.bucket.sample_info.map((s) => (
                <Box key={s.kind}>
                    {s.kind}: {s.curve ? formatCurve(s.curve) : 'No curve'}
                </Box>
            ))}
        </VStack>
    );
}

function EditOptions({ model }: { model: EditRequestModel }) {
    const req = useBehavior(model.state.request);
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
                />
            </Field>

            <Field label='Number of Copies'>
                <SmartInput
                    value={req.n_copies}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ n_copies: v })}
                    index={idx++}
                    size='sm'
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

    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Sample ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Kind</Table.ColumnHeader>
                        <Table.ColumnHeader>Validation</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {req.samples.map((s, i) => (
                        <Table.Row key={i}>
                            <Table.Cell>{s.id}</Table.Cell>
                            <Table.Cell>{s.kind}</Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell textAlign='right' padding={1}>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    onClick={() => model.update({ samples: req.samples.filter((p) => s !== p) })}
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

function AddSamplesDialog({ state }: { state: BehaviorSubject<{ csv: string }> }) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    Paste a CSV file with <code>Sample ID, Kind</code> columns.
                </Alert.Title>
            </Alert.Root>
            <Textarea value={current.csv} onChange={(e) => state.next({ csv: e.target.value })} rows={7} />
        </VStack>
    );
}
