import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { uuid4 } from '@/lib/util/uuid';
import { Bucket, readBucket } from '@/model/bucket';
import { Button, HStack, Table } from '@chakra-ui/react';
import { Link, NavigateFunction, useNavigate } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { BucketsApi } from './api';
import { BucketsBreadcrumb } from './common';
import { DialogService } from '@/lib/services/dialog';
import { resolveRoute } from '../routing';
import { FileDropArea } from '@/lib/components/file-upload';
import { formatISODateString } from '@/lib/util/datetime';
import { LuCirclePlus, LuCopy, LuImport, LuPencil, LuTrash } from 'react-icons/lu';

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

    import(navigate: NavigateFunction) {
        DialogService.show({
            title: 'Create Request',
            body: ImportBucketDialog,
            state: new BehaviorSubject({ files: [] }),
            onOk: async ({ files }: { files: File[] }) => {
                if (!files[0]) {
                    throw new Error('No file selected');
                }

                const file = files[0];
                const data = await file.text();
                const curve = { ...readBucket(JSON.parse(data)), id: uuid4() };
                await BucketsApi.save(curve);
                navigate(resolveRoute(BucketsBreadcrumb.path!, curve.id));
            },
        });
    }
}

async function createModel() {
    const model = new BucketsModel();
    await model.init();
    return model;
}

export function BucketsUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <Layout breadcrumbs={[BucketsBreadcrumb]} buttons={!!model && <NavButtons model={model} />}>
            <AsyncWrapper loading={!model || loading} error={error}>
                <BucketList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: BucketsModel }) {
    const navigate = useNavigate();

    return (
        <HStack gap={1}>
            <Button
                onClick={() => navigate(resolveRoute(BucketsBreadcrumb.path!, 'new'))}
                size='xs'
                colorPalette='blue'
            >
                <LuCirclePlus /> New Bucket
            </Button>
            <Button onClick={() => model.import(navigate)} size='xs' colorPalette='blue'>
                <LuImport /> Import
            </Button>
        </HStack>
    );
}

function BucketList({ model }: { model: BucketsModel }) {
    const buckets = useBehavior(model.state.buckets);
    const navigate = useNavigate();
    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Project</Table.ColumnHeader>
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader>Modified On</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {buckets.map((bucket) => (
                        <Table.Row
                            key={bucket.id}
                            onDoubleClick={() => navigate(resolveRoute(BucketsBreadcrumb.path!, bucket.id!))}
                        >
                            <Table.Cell>{bucket.name || 'unnamed'}</Table.Cell>
                            <Table.Cell>{bucket.project}</Table.Cell>
                            <Table.Cell>{bucket.description}</Table.Cell>
                            <Table.Cell>{formatISODateString(bucket.modified_on)}</Table.Cell>
                            <Table.Cell textAlign='right' padding={1}>
                                <Button size='xs' colorPalette='blue' variant='subtle' asChild title='Edit'>
                                    <Link to={resolveRoute(BucketsBreadcrumb.path!, bucket.id!)}>
                                        <LuPencil />
                                    </Link>
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    onClick={() => model.duplicate(bucket, navigate)}
                                    variant='subtle'
                                    title='Duplicate'
                                    ms={1}
                                >
                                    <LuCopy />
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={1}
                                    onClick={() => model.remove(bucket.id!)}
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

function ImportBucketDialog({ state }: { state: BehaviorSubject<{ files: File[] }> }) {
    return <FileDropArea onChange={(files) => state.next({ files })} extensions={['.json']} />;
}
