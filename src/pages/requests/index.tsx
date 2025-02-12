import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { uuid4 } from '@/lib/uuid';
import { ARPRequest } from '@/model/request';
import { Button, HStack, Table } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { RequestsApi } from './api';
import { RequestsBreadcrumb, requestPath } from './common';

class RequestsModel extends ReactiveModel {
    state = {
        requests: new BehaviorSubject<ARPRequest[]>([]),
    };

    async init() {
        const requests = await RequestsApi.list();
        this.state.requests.next(requests);
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
            <Button onClick={() => navigate(requestPath(uuid4()))} size='xs' colorPalette='blue'>
                New Request
            </Button>
            <Button onClick={() => alert('todo')} size='xs' colorPalette='blue'>
                New Production
            </Button>
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
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {requests.map((req) => (
                        <Table.Row key={req.id}>
                            <Table.Cell>{req.name || 'unnamed'}</Table.Cell>
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
