import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
import { ToastService } from '@/lib/services/toast';
import { dropDB } from '@/lib/simple-store';
import { Button, VStack } from '@chakra-ui/react';
import { Layout } from '../layout';
import { SettingsBreadcrumb } from './common';

class SettingsModel extends ReactiveModel {
    async init() {}

    resetStore = async () => {
        DialogService.confirm({
            title: 'Reset DB',
            message: 'Are you sure you want to reset the database?',
            onOk: async () => {
                await dropDB();
                ToastService.info('DB Reset', { duration: 3000 });
                window.location.reload();
            },
        });
    };

    exportDB = async () => {
        ToastService.info('TODO', { duration: 3000 });
    };

    importDB = async () => {
        ToastService.info('TODO', { duration: 3000 });
    };
}

async function createModel() {
    const model = new SettingsModel();
    await model.init();
    return model;
}

export function SettingsUI() {
    const { model, loading, error } = useAsyncModel(createModel);

    return (
        <Layout breadcrumbs={[SettingsBreadcrumb]} buttons={!!model && <NavButtons model={model} />}>
            <AsyncWrapper loading={!model || loading} error={error}>
                <Settings model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function NavButtons({ model }: { model: SettingsModel }) {
    return null;
}

function Settings({ model }: { model: SettingsModel }) {
    return (
        <VStack gap={2}>
            <Button onClick={model.resetStore}>Reset DB</Button>
            <Button onClick={model.exportDB}>Export DB</Button>
            <Button onClick={model.importDB}>Import DB</Button>
        </VStack>
    );
}
