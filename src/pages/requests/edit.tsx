import { formatCurve } from '@/api/model/curve';
import { PlateLayouts } from '@/api/model/plate';
import { ARPRequest, ARPRequestSample, ARPRequestStatusOptions, writeARPRequest } from '@/api/model/request';
import { getRequestSampleInfo, parseRequestSamplesCSV, validateRequestSample } from '@/api/request';
import { Field } from '@/components/ui/field';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { AsyncActionButton } from '@/lib/components/button';
import { SmartInput, SmartParsers } from '@/lib/components/input';
import { PlateModel, PlateVisual } from '@/lib/components/plate';
import { SimpleSelect } from '@/lib/components/select';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { Alert, Box, Button, Flex, HStack, Table, Tabs, Textarea, VStack } from '@chakra-ui/react';
import { LuCirclePlus, LuCombine, LuDownload, LuSave, LuTrash } from 'react-icons/lu';
import { useParams } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { updateBucketTemplatePlate } from '../buckets/common';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { requestBreadcrumb, RequestsBreadcrumb } from './common';
import { useMemo } from 'react';
import { download } from '@/lib/util/download';
import { memoizeLatest } from '@/lib/util/misc';
import { ARPRequestBuilder } from '@/api/request/production';

class EditRequestModel extends ReactiveModel {
    state = {
        request: new BehaviorSubject<ARPRequest>(undefined as any),
    };

    plate = new PlateModel(PlateLayouts[384]);

    get request() {
        return this.state.request.value;
    }

    get bucket() {
        return this.request.bucket;
    }

    private _sampleInfo = memoizeLatest(getRequestSampleInfo);
    get sampleInfo() {
        return this._sampleInfo(this.request);
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
        const data = writeARPRequest(this.request);
        download(
            new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
            `request-${this.request.name || this.request.id || Date.now()}.json`
        );
    };

    produce = async () => {
        const builder = new ARPRequestBuilder(this.request);
        builder.build();
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
        <HStack gap={1}>
            <Button onClick={model.addSamples} size='xs' colorPalette='green'>
                <LuCirclePlus /> Add Samples
            </Button>
            <AsyncActionButton action={model.produce} size='xs' colorPalette='purple'>
                <LuCombine /> Produce
            </AsyncActionButton>
            <AsyncActionButton action={model.export} size='xs' colorPalette='blue'>
                <LuDownload /> Export
            </AsyncActionButton>
            <AsyncActionButton action={model.save} size='xs' colorPalette='blue'>
                <LuSave /> Save
            </AsyncActionButton>
        </HStack>
    );
}

function EditRequest({ model }: { model: EditRequestModel }) {
    useReactiveModel(model);
    return (
        <Tabs.Root defaultValue="samples" display='flex' flexDirection='column' height='full'>
      <Tabs.List>
        <Tabs.Trigger value="samples">
          {/* <LuUser /> */}
          Samples
        </Tabs.Trigger>
        <Tabs.Trigger value="production">
          {/* <LuFolder /> */}
          Production
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content position='relative' value="samples" flexGrow={1}>
        <Samples model={model} />
      </Tabs.Content>
      <Tabs.Content position='relative' value="production" flexGrow={1}>
        <Production model={model} />
      </Tabs.Content>
    </Tabs.Root>
    );
}

function Samples({ model }: { model: EditRequestModel }) {
    return <HStack h='100%' position='relative' gap={2}>
            <SampleTable model={model} />
            <Flex gap={2} minW={400} maxW={400} w={400} flexDirection='column' h='100%'>
                <Box flexGrow={1} position='relative'>
                    <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll' pe={2}>
                        <BucketInfo model={model} />
                        <EditOptions model={model} />
                    </Box>
                </Box>
            </Flex>
        </HStack>;
}

function Production({ model }: { model: EditRequestModel }) {
    return <div>TODO</div>;
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
                        <Table.ColumnHeader>Validation</Table.ColumnHeader>
                        <Table.ColumnHeader>Source Label</Table.ColumnHeader>
                        <Table.ColumnHeader>Source Well</Table.ColumnHeader>
                        <Table.ColumnHeader>Kinds</Table.ColumnHeader>
                        <Table.ColumnHeader>Comment</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {req.samples.map((s, i) => (
                        <Table.Row key={i}>
                            <Table.Cell>{s.id}</Table.Cell>
                            <Table.Cell>
                                <SampleValidation model={model} sample={s} />
                            </Table.Cell>
                            <Table.Cell>{s.source_label}</Table.Cell>
                            <Table.Cell>{s.source_well}</Table.Cell>
                            <Table.Cell>{s.kinds?.join(', ')}</Table.Cell>
                            <Table.Cell>{s.comment}</Table.Cell>
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

function AddSamplesDialog({ state }: { state: BehaviorSubject<{ csv: string }> }) {
    const current = useBehavior(state);
    return (
        <VStack gap={2}>
            <Alert.Root status='info'>
                <Alert.Indicator />
                <Alert.Title>
                    Paste a CSV file with <code>Sample ID, Kinds, Source Label, Source Well, Comment</code> columns.
                    <code>Kinds</code> can be separated by whitespace.
                </Alert.Title>
            </Alert.Root>
            <Textarea value={current.csv} onChange={(e) => state.next({ csv: e.target.value })} rows={7} autoFocus />
        </VStack>
    );
}
