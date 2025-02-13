import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { uuid4 } from '@/lib/uuid';
import { ARPRequest, createARPRequest } from '@/model/request';
import { Alert, Badge, Button, HStack, Table, VStack } from '@chakra-ui/react';
import { NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { RequestsBreadcrumb, requestPath } from './common';
import { SimpleSelect } from '@/lib/components/select';
import { BucketsApi } from '../buckets/api';
import { DialogService } from '@/lib/services/dialog';

class RequestsModel extends ReactiveModel {
    state = {
        requests: new BehaviorSubject<ARPRequest[]>([]),
    };

    async init() {
        const requests = await RequestsApi.list();
        this.state.requests.next(requests);
    }

    async createNew(navigate: NavigateFunction) {
        const buckets = await BucketsApi.list();
        const options = buckets.map((b) => [b.id, b.name]);
        const state = new BehaviorSubject('');
        DialogService.show({
            title: 'Create Request',
            body: CreateRequestDialog,
            state,
            model: options,
            onOk: async (state) => {
                const bucket = buckets.find((c) => c.id === state);
                if (!bucket) return;

                const req = createARPRequest(bucket);
                await RequestsApi.save(req);
                navigate(requestPath(req.id));
            },
        });
    }

    remove = async (id: string) => {
        await RequestsApi.remove(id);
        await this.init();
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
        <HStack gap={2}>
            <Button onClick={() => model.createNew(navigate)} size='xs' colorPalette='blue'>
                New Request
            </Button>
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
            <Table.Root size='sm' stickyHeader>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Status</Table.ColumnHeader>
                        <Table.ColumnHeader>Bucket</Table.ColumnHeader>
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {requests.map((req) => (
                        <Table.Row key={req.id}>
                            <Table.Cell>{req.name || 'unnamed'}</Table.Cell>
                            <Table.Cell>
                                <Badge>{req.status}</Badge>
                            </Table.Cell>
                            <Table.Cell>{req.bucket.name}</Table.Cell>
                            <Table.Cell>{req.description}</Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell textAlign='right'>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    onClick={() => navigate(requestPath(req.id!))}
                                    variant='subtle'
                                >
                                    Edit
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={2}
                                    onClick={() => model.remove(req.id!)}
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

function CreateRequestDialog({
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
                    A snapshot of the bucket will be created. Modifying the selected bucket will only affect future
                    requests.
                </Alert.Title>
            </Alert.Root>
            <SimpleSelect
                placeholder='Select bucket...'
                value={current}
                allowEmpty
                onChange={(v) => state.next(v)}
                options={options}
            />
        </VStack>
    );
}
