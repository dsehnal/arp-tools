import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { uuid4 } from '@/lib/uuid';
import { Bucket } from '@/model/bucket';
import { Box, Button, Table, VStack } from '@chakra-ui/react';
import { useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { BucketsApi } from './api';

class BucketsModel extends ReactiveModel {
    state = {
        buckets: new BehaviorSubject<Bucket[]>([]),
    };

    async init() {
        const buckets = await BucketsApi.list();
        this.state.buckets.next(buckets);
    }

    remove = async (id: string) => {
        await BucketsApi.remove(id);
        await this.init();
    };
}

async function createModel() {
    const model = new BucketsModel();
    await model.init();
    return model;
}

export function BucketsUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <AsyncWrapper loading={!model || loading} error={error}>
            <BucketList model={model!} />
        </AsyncWrapper>
    );
}

function BucketList({ model }: { model: BucketsModel }) {
    const buckets = useBehavior(model.state.buckets);
    const navigate = useNavigate();
    return (
        <VStack gap={2} w='100%'>
            <Box textAlign='right' w='100%'>
                <Button onClick={() => navigate(`/buckets/${uuid4()}`)} size='sm' colorPalette='blue'>
                    New Bucket
                </Button>
            </Box>
            <Box w='100%'>
                <Table.ScrollArea borderWidth='1px' w='100%'>
                    <Table.Root size='sm' stickyHeader>
                        <Table.Header>
                            <Table.Row bg='bg.subtle'>
                                <Table.ColumnHeader></Table.ColumnHeader>
                                <Table.ColumnHeader>Name</Table.ColumnHeader>
                                <Table.ColumnHeader>Project</Table.ColumnHeader>
                                <Table.ColumnHeader>Description</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>

                        <Table.Body>
                            {buckets.map((bucket) => (
                                <Table.Row key={bucket.id}>
                                    <Table.Cell>
                                        <Button
                                            key={bucket.id}
                                            size='xs'
                                            colorPalette='blue'
                                            onClick={() => navigate(`/buckets/${bucket.id}`)}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            key={bucket.id}
                                            size='xs'
                                            colorPalette='red'
                                            ms={2}
                                            onClick={() => model.remove(bucket.id!)}
                                        >
                                            Remove
                                        </Button>
                                    </Table.Cell>
                                    <Table.Cell>{bucket.name || 'unnamed'}</Table.Cell>
                                    <Table.Cell>{bucket.project}</Table.Cell>
                                    <Table.Cell>{bucket.description}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Table.ScrollArea>
            </Box>
        </VStack>
    );
}
