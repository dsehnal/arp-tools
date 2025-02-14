import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { ReactiveModel } from '@/lib/reactive-model';
import { ARPProduction } from '@/model/production';
import { Button, Table } from '@chakra-ui/react';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { ProductionBreadcrumb } from './common';

class ProductionsModel extends ReactiveModel {
    state = {
        productions: new BehaviorSubject<ARPProduction[]>([]),
    };

    async init() {
        // const requests = await RequestsApi.list();
        // this.state.requests.next(requests);
    }

    remove = async (id: string) => {
        // await RequestsApi.remove(id);
        await this.init();
    };
}

async function createModel() {
    const model = new ProductionsModel();
    await model.init();
    return model;
}

export function ProductionsUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <Layout breadcrumbs={[ProductionBreadcrumb]} buttons={!!model && <NavButtons model={model} />}>
            <AsyncWrapper loading={!model || loading} error={error}>
                <RequestList model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: ProductionsModel }) {
    // const navigate = useNavigate();
    return null;
}

function RequestList({ model }: { model: ProductionsModel }) {
    const productions = useBehavior(model.state.productions);
    // const navigate = useNavigate();
    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Name</Table.ColumnHeader>
                        <Table.ColumnHeader>Description</Table.ColumnHeader>
                        <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {productions.map((prod) => (
                        <Table.Row key={prod.id}>
                            <Table.Cell>...</Table.Cell>
                            <Table.Cell>...</Table.Cell>
                            <Table.Cell textAlign='right' padding={1}>
                                <Button
                                    size='xs'
                                    colorPalette='blue'
                                    // onClick={() => navigate(requestPath(prod.id!))}
                                    variant='subtle'
                                >
                                    Edit
                                </Button>
                                <Button
                                    size='xs'
                                    colorPalette='red'
                                    ms={1}
                                    onClick={() => model.remove(prod.id!)}
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
