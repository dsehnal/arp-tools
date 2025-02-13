import Papa from 'papaparse';
import { Field } from '@/components/ui/field';
import { toaster } from '@/components/ui/toaster';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { SmartInput, SmartParsers } from '@/lib/components/input';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { ARPRequest, ARPRequestSample, ARPRequestStatusOptions } from '@/model/request';
import { Alert, Box, Button, Flex, HStack, Table, Textarea, VStack } from '@chakra-ui/react';
import { useParams } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { requestBreadcrumb, RequestsBreadcrumb } from './common';
import { PlateModel, PlateVisual } from '@/lib/plate';
import { PlateLayouts } from '@/model/plate';
import { updateBucketTemplatePlate } from '../buckets/common';
import { SimpleSelect } from '@/lib/components/select';
import { formatCurve } from '@/model/curve';
import { DialogService } from '@/lib/services/dialog';

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
        toaster.create({
            title: 'Saved',
            duration: 2000,
            type: 'success',
        });
    };

    export = () => {
        alert('TODO');
    };

    produce = () => {
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
            // TODO: throw error
            return;
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
            breadcrumbs={[RequestsBreadcrumb, requestBreadcrumb({ isLoading: loading, name: 'Edit', id: model?.id })]}
            buttons={!!model && <NavButtons model={model} />}
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <EditRequest model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: EditRequestModel }) {
    return (
        <HStack gap={2}>
            <Button onClick={model.addSamples} size='xs' colorPalette='green'>
                Add Samples
            </Button>
            <Button onClick={model.save} size='xs' colorPalette='blue'>
                Save
            </Button>
            <Button onClick={model.export} size='xs' colorPalette='blue'>
                Export
            </Button>
            <Button onClick={model.produce} size='xs' colorPalette='blue'>
                Produce
            </Button>
        </HStack>
    );
}

function EditRequest({ model }: { model: EditRequestModel }) {
    useReactiveModel(model);
    return (
        <HStack h='100%' position='relative' gap={4}>
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
    return (
        <VStack gap={1}>
            <Field label='Request Name'>
                <SmartInput
                    placeholder='Enter Name...'
                    value={req.name}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ name: v })}
                    index={0}
                    size='sm'
                />
            </Field>

            <Field label='Number of Copies'>
                <SmartInput
                    value={req.n_copies}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ n_copies: v })}
                    index={7}
                    size='sm'
                />
            </Field>

            <Field label='Description'>
                <SmartInput
                    placeholder='Enter Description...'
                    value={req.description}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.update({ description: v })}
                    index={0}
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
            <Table.Root size='sm' stickyHeader>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Sample ID</Table.ColumnHeader>
                        <Table.ColumnHeader>Kind</Table.ColumnHeader>
                        <Table.ColumnHeader>Validation</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {req.samples.map((s, i) => (
                        <Table.Row key={i}>
                            <Table.Cell>{s.id}</Table.Cell>
                            <Table.Cell>{s.kind}</Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell textAlign='right'>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    onClick={() => model.update({ samples: req.samples.filter((p) => s !== p) })}
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
