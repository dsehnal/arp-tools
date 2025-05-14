import { AsyncWrapper } from '@/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { ARPRequest, createARPRequest } from '@/lib/tools/model/request';
import { Alert, Badge, Button, HStack, Table, VStack } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { RequestsBreadcrumb } from './common';
import { SimpleSelect } from '@/components/select';
import { BucketsApi } from '../buckets/api';
import { DialogService } from '@/lib/services/dialog';
import { resolveRoute } from '../routing';
import { AsyncActionButton } from '@/components/button';
import { formatISODateString } from '@/lib/util/datetime';
import { LuCirclePlus, LuPencil, LuTrash } from 'react-icons/lu';
import { FileDropArea } from '@/components/file-upload';
import { Bucket, readBucket } from '@/lib/tools/model/bucket';
import { validateBucket } from '@/lib/tools/bucket';

class RequestsModel extends ReactiveModel {
    state = {
        requests: new BehaviorSubject<ARPRequest[]>([]),
    };

    async init() {
        const requests = await RequestsApi.list();
        requests.sort((a, b) =>
            (b.modified_on || b.created_on || a.name).localeCompare(a.modified_on || a.created_on || b.name)
        );
        this.state.requests.next(requests);
    }

    async createNew(navigate: NavigateFunction) {
        const buckets = await BucketsApi.list();
        const options = buckets.map((b) => [b.id, b.name || 'unnamed']);
        const state = new BehaviorSubject({ name: '', files: [] });
        DialogService.show({
            title: 'Create Request',
            body: CreateRequestDialog,
            state,
            model: options,
            onOk: async (state: { name: string | undefined; files: File[] }) => {
                let bucket: Bucket | undefined;

                if (state.files.length) {
                    const json = JSON.parse(await state.files[0].text());
                    bucket = readBucket(json);
                } else {
                    bucket = buckets.find((c) => c.id === state.name);
                }
                if (!bucket) return;

                const validation = validateBucket(bucket);
                if (validation.errors.length) {
                    throw new Error('The bucket contains errors. Please fix them before creating a request.');
                }

                const req = createARPRequest(bucket);
                await RequestsApi.save(req);
                navigate(resolveRoute(RequestsBreadcrumb.path!, req.id));
            },
        });
    }

    remove = (id: string) => {
        DialogService.confirm({
            title: 'Remove Request',
            message: 'Are you sure you want to remove this request?',
            onOk: async () => {
                await RequestsApi.remove(id);
                await this.init();
            },
        });
    };
}

async function createModel() {
    const model = new RequestsModel();
    await model.init();
    return model;
}

export function RequestsUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <Layout breadcrumbs={[RequestsBreadcrumb]} buttons={!!model && <NavButtons model={model} />}>
            <AsyncWrapper loading={!model || loading} error={error}>
                <RequestList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: RequestsModel }) {
    const navigate = useNavigate();
    return (
        <HStack gap={1}>
            <AsyncActionButton action={() => model.createNew(navigate)} size='xs' colorPalette='blue'>
                <LuCirclePlus /> New Request
            </AsyncActionButton>
            {/* <Button onClick={() => alert('todo')} size='xs' colorPalette='blue'>
                New Production
            </Button> */}
        </HStack>
    );
}

function RequestList({ model }: { model: RequestsModel }) {
    const requests = useBehavior(model.state.requests);
    const navigate = useNavigate();

    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                        <Table.ColumnHeader>Bucket</Table.ColumnHeader>
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader>Modified On</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {requests.map((req) => (
                        <Table.Row
                            key={req.id}
                            onDoubleClick={() => navigate(resolveRoute(RequestsBreadcrumb.path!, req.id))}
                        >
                            <Table.Cell>{req.name || 'unnamed'}</Table.Cell>
                            <Table.Cell>
                                <Badge>{req.status}</Badge>
                            </Table.Cell>
                            <Table.Cell>{req.bucket.name}</Table.Cell>
                            <Table.Cell>{req.description}</Table.Cell>
                            <Table.Cell>{formatISODateString(req.modified_on)}</Table.Cell>
                            <Table.Cell textAlign='right' padding={1}>
                                <Button size='xs' colorPalette='blue' variant='subtle' title='Edit' asChild>
                                    <Link to={resolveRoute(RequestsBreadcrumb.path!, req.id)}>
                                        <LuPencil />
                                    </Link>
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={1}
                                    onClick={() => model.remove(req.id!)}
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

function CreateRequestDialog({
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
                        A snapshot of the bucket will be created. Modifying the selected bucket will only affect future
                        requests.
                    </Alert.Title>
                </Alert.Root>
            )}
            {current.files?.length === 0 && (
                <SimpleSelect
                    placeholder='Select bucket...'
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
