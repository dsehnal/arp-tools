import { toaster } from '@/components/ui/toaster';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { DialogService } from '@/lib/services/dialog';
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
                toaster.create({
                    title: 'DB Reset',
                    duration: 2000,
                    type: 'info',
                });
            },
        });
    };

    exportDB = async () => {
        toaster.create({
            title: 'TODO',
            duration: 2000,
            type: 'info',
        });
    };

    importDB = async () => {
        toaster.create({
            title: 'TODO',
            duration: 2000,
            type: 'info',
        });
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
