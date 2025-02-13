import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { uuid4 } from '@/lib/uuid';
import { Bucket } from '@/model/bucket';
import { Button, Table } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { BucketsApi } from './api';
import { BucketsBreadcrumb } from './common';
import { DialogService } from '@/lib/services/dialog';
import { resolveRoute } from '../routing';

class BucketsModel extends ReactiveModel {
    state = {
        buckets: new BehaviorSubject<Bucket[]>([]),
    };

    async init() {
        const buckets = await BucketsApi.list();
        this.state.buckets.next(buckets);
    }

    remove = (id: string) => {
        DialogService.confirm({
            title: 'Remove Bucket',
            message: 'Are you sure you want to remove this bucket?',
            onOk: async () => {
                await BucketsApi.remove(id);
                await this.init();
            },
        });
    };

    duplicate(bucket: Bucket, navigate: NavigateFunction) {
        DialogService.confirm({
            title: 'Duplicate Bucket',
            message: 'Do you want to duplicate this bucket?',
            onOk: () => this.applyDuplicate(bucket, navigate),
        });
    }

    async applyDuplicate(bucket: Bucket, navigate: NavigateFunction) {
        const newBucket = { ...bucket, id: uuid4(), name: `Copy of ${bucket.name}` };
        await BucketsApi.save(newBucket);
        navigate(resolveRoute(BucketsBreadcrumb.path!, newBucket.id));
    }
}

async function createModel() {
    const model = new BucketsModel();
    await model.init();
    return model;
}

export function BucketsUI() {
    const { model, loading, error } = useAsyncModel(createModel);
    const navigate = useNavigate();

    return (
        <Layout
            breadcrumbs={[BucketsBreadcrumb]}
            buttons={
                <Button
                    onClick={() => navigate(resolveRoute(BucketsBreadcrumb.path!, 'new'))}
                    size='xs'
                    colorPalette='blue'
                >
                    New Bucket
                </Button>
            }
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <BucketList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function BucketList({ model }: { model: BucketsModel }) {
    const buckets = useBehavior(model.state.buckets);
    const navigate = useNavigate();
    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Project</Table.ColumnHeader>
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {buckets.map((bucket) => (
                        <Table.Row key={bucket.id}>
                            <Table.Cell>{bucket.name || 'unnamed'}</Table.Cell>
                            <Table.Cell>{bucket.project}</Table.Cell>
                            <Table.Cell>{bucket.description}</Table.Cell>
                            <Table.Cell></Table.Cell>
                            <Table.Cell textAlign='right'>
                                <Button size='xs' colorPalette='blue' variant='subtle' asChild>
                                    <Link to={resolveRoute(BucketsBreadcrumb.path!, bucket.id!)}>Edit</Link>
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    onClick={() => model.duplicate(bucket, navigate)}
                                    variant='subtle'
                                    ms={2}
                                >
                                    Duplicate
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={2}
                                    onClick={() => model.remove(bucket.id!)}
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
