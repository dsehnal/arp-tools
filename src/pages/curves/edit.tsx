import { AsyncWrapper } from '@/components/async-wrapper';
import { AsyncActionButton } from '@/components/button';
import { SmartFormatters, SmartInput, SmartParsers } from '@/components/input';
import { Field } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { InfoTip } from '@/components/ui/toggle-tip';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { ReactiveModel } from '@/lib/reactive-model';
import { ToastService } from '@/lib/services/toast';
import { findCurve } from '@/lib/tools/curve';
import { DefaultCurveOptions, DilutionCurve, DilutionCurveOptions } from '@/lib/tools/model/curve';
import { uuid4 } from '@/lib/util/uuid';
import { Box, Button, Flex, HStack, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { LuChartNoAxesColumn, LuDownload, LuSave } from 'react-icons/lu';
import { useParams } from 'react-router';
import { BehaviorSubject } from 'rxjs';
import { Layout } from '../layout';
import { resolvePrefixedRoute } from '../routing';
import { CurvesApi } from './api';
import { curveBreadcrumb, CurvesBreadcrumb, DilutionCurveTable, downloadCurve } from './common';

class EditCurveModel extends ReactiveModel {
    state = {
        name: new BehaviorSubject<string>(''),
        options: new BehaviorSubject<DilutionCurveOptions>(DefaultCurveOptions),
        curve: new BehaviorSubject<DilutionCurve | undefined>(undefined),
    };

    get options() {
        return this.state.options.value;
    }

    get curve() {
        return this.state.curve.value;
    }

    update(next: Partial<DilutionCurveOptions>) {
        this.state.options.next({ ...this.options, ...next });
    }

    build = () => {
        const curve = findCurve(this.options);
        this.state.curve.next(curve);
    };

    save = async () => {
        if (!this.curve) {
            ToastService.info('Nothing to save');
            return;
        }

        const curve = { ...this.curve, name: this.state.name.value, id: this.id };
        await CurvesApi.save(curve);
        this.state.curve.next(curve);
        ToastService.success('Saved');
        window.history.replaceState(null, '', resolvePrefixedRoute(CurvesBreadcrumb.path!, curve.id));
    };

    export = async () => {
        if (!this.curve) {
            ToastService.info('Nothing to export');
            return;
        }
        downloadCurve(this.curve, this.state.name.value);
    };

    async init() {
        if (this.id === 'new') {
            this.id = uuid4();
            return;
        }

        const curve = await CurvesApi.get(this.id);
        if (curve) {
            this.state.curve.next(curve);
            this.state.name.next(curve.name ?? '');
        } else {
            throw new Error('Curve not found');
        }
        if (curve?.options) {
            this.state.options.next(curve.options);
        }
    }

    constructor(public id: string) {
        super();
    }
}

async function createModel(id: string) {
    const model = new EditCurveModel(id);
    await model.init();
    return model;
}

export function EditCurveUI() {
    const { id } = useParams();
    const { model, loading, error } = useAsyncModel(createModel, id);

    return (
        <Layout
            breadcrumbs={[
                CurvesBreadcrumb,
                curveBreadcrumb({ isLoading: loading, name: <Breadcrumb model={model} />, id: model?.id }),
            ]}
            buttons={!!model && <NavButtons model={model} />}
        >
            <AsyncWrapper loading={!model || loading} error={error}>
                <EditCurve model={model!} />
            </AsyncWrapper>
        </Layout>
    );
}

function Breadcrumb({ model }: { model?: EditCurveModel }) {
    const curve = useBehavior(model?.state.curve);
    const name = useBehavior(model?.state.name);
    if (!curve?.id) return 'New Curve';
    return name ?? 'Unnamed Curve';
}

function NavButtons({ model }: { model: EditCurveModel }) {
    return (
        <HStack gap={1}>
            <AsyncActionButton action={model.export} size='xs' colorPalette='blue' variant='subtle'>
                <LuDownload /> Export
            </AsyncActionButton>
            <AsyncActionButton action={model.save} size='xs' colorPalette='blue'>
                <LuSave /> Save
            </AsyncActionButton>
        </HStack>
    );
}

function EditCurve({ model }: { model: EditCurveModel }) {
    useReactiveModel(model);
    return (
        <HStack h='100%' position='relative' gap={2}>
            <EditCurveTable model={model} />
            <Flex gap={2} minW={400} maxW={400} w={400} flexDirection='column' h='100%'>
                <Box flexGrow={1} position='relative'>
                    <Box pos='absolute' inset={0} overflow='hidden' overflowY='scroll' pe={2}>
                        <EditCurveOptions model={model} />
                    </Box>
                </Box>
                <Button w='100%' onClick={model.build} size='sm' colorPalette='blue'>
                    <LuChartNoAxesColumn /> Build Curve
                </Button>
            </Flex>
        </HStack>
    );
}

function EditCurveOptions({ model }: { model: EditCurveModel }) {
    const options = useBehavior(model.state.options);
    const name = useBehavior(model.state.name);
    const [advanced, setAdvanced] = useState(false);
    let idx = 0;

    return (
        <VStack gap={1}>
            <Field label='Name'>
                <SmartInput
                    value={name}
                    parse={SmartParsers.trim}
                    onChange={(v) => model.state.name.next(v)}
                    index={idx++}
                    size='sm'
                />
            </Field>
            <Field label='Source Concentration (mM)'>
                <SmartInput
                    value={options.source_concentration_m}
                    format={SmartFormatters.unit(1e3)}
                    parse={SmartParsers.unit(1e-3)}
                    onChange={(v) => model.update({ source_concentration_m: v })}
                    index={idx++}
                    size='sm'
                />
            </Field>
            <Field label='Intermediate Volume (uL)'>
                <SmartInput
                    value={options.intermediate_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-6)}
                    onChange={(v) => model.update({ intermediate_volume_l: v })}
                    index={idx++}
                    size='sm'
                />
            </Field>
            <Field label='Assay Volume (uL)'>
                <SmartInput
                    value={options.assay_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-6)}
                    onChange={(v) => model.update({ assay_volume_l: v })}
                    index={idx++}
                    size='sm'
                />
            </Field>

            <Field label='Top Concentration (uM)'>
                <SmartInput
                    value={options.top_concentration_m}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-6)}
                    onChange={(v) => model.update({ top_concentration_m: v })}
                    index={idx++}
                    size='sm'
                />
            </Field>
            <Field label='Dilution Factor'>
                <HStack gap={2} w='full'>
                    <Box flexGrow={1}>
                        <SmartInput
                            value={options.dilution_factor}
                            format={SmartFormatters.unit(1, 6)}
                            parse={SmartParsers.number}
                            onChange={(v) => model.update({ dilution_factor: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Box>
                    <Button variant='subtle' size='sm' onClick={() => model.update({ dilution_factor: Math.sqrt(10) })}>
                        √10
                    </Button>
                    <Button variant='subtle' size='sm' onClick={() => model.update({ dilution_factor: 2 })}>
                        2
                    </Button>
                </HStack>
            </Field>
            <Field label='Number of Points'>
                <SmartInput
                    value={options.n_points}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ n_points: v })}
                    index={idx++}
                    size='sm'
                />
            </Field>

            <Button size='xs' onClick={() => setAdvanced(!advanced)} variant='ghost' w='full'>
                {advanced ? 'Hide Advanced' : 'Show Advanced'}
            </Button>

            {advanced && (
                <>
                    <Field label='Max Intermediate Plates'>
                        <SmartInput
                            value={options.max_intermadiate_plates}
                            parse={SmartParsers.number}
                            onChange={(v) => model.update({ max_intermadiate_plates: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Max Points per Plate'>
                        <SmartInput
                            value={options.max_intermediate_points_per_plate}
                            parse={SmartParsers.number}
                            onChange={(v) => model.update({ max_intermediate_points_per_plate: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Tolerance (%)'>
                        <SmartInput
                            value={options.tolerance}
                            format={SmartFormatters.unit(1e2)}
                            parse={SmartParsers.unit(1e-2)}
                            onChange={(v) => model.update({ tolerance: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field
                        label={
                            <>
                                Adjust Intermediate Volume{' '}
                                <InfoTip>
                                    Add intermediate transfer volume to the total volume of the well. Results in a more
                                    accurate concetration computation.
                                </InfoTip>
                            </>
                        }
                    >
                        <Switch
                            size='sm'
                            checked={options.adjust_intermediate_volume}
                            onCheckedChange={(e) => model.update({ adjust_intermediate_volume: e.checked })}
                        />
                    </Field>
                    <Field
                        label={
                            <>
                                Single Source Transfers{' '}
                                <InfoTip>
                                    If enabled, each point can only building using samples from a single source plate.
                                </InfoTip>
                            </>
                        }
                    >
                        <Switch
                            size='sm'
                            checked={options.single_source_transfers}
                            onCheckedChange={(e) => model.update({ single_source_transfers: e.checked })}
                        />
                    </Field>
                    <Field label='Min Total Transfer Volume (nL)'>
                        <SmartInput
                            value={options.min_transfer_volume_l}
                            format={SmartFormatters.unit(1e9)}
                            parse={SmartParsers.unit(1e-9)}
                            onChange={(v) => model.update({ min_transfer_volume_l: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Max Total Transfer Volume (nL)'>
                        <SmartInput
                            value={options.max_transfer_volume_l}
                            format={SmartFormatters.unit(1e9)}
                            parse={SmartParsers.unit(1e-9)}
                            onChange={(v) => model.update({ max_transfer_volume_l: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Max Intermediate Transfer Volume (nL)'>
                        <SmartInput
                            value={options.max_intermediate_transfer_volume_l}
                            format={SmartFormatters.unit(1e9)}
                            parse={SmartParsers.unit(1e-9)}
                            onChange={(v) => model.update({ max_intermediate_transfer_volume_l: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Droplet Size (nL)'>
                        <SmartInput
                            value={options.droplet_size_l}
                            format={SmartFormatters.unit(1e9)}
                            parse={SmartParsers.unit(1e-9)}
                            onChange={(v) => model.update({ droplet_size_l: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                    <Field label='Number of Intermediate Point Samples'>
                        <SmartInput
                            value={options.num_intermediate_point_samples}
                            parse={SmartParsers.number}
                            onChange={(v) => model.update({ num_intermediate_point_samples: v })}
                            index={idx++}
                            size='sm'
                        />
                    </Field>
                </>
            )}
        </VStack>
    );
}

function EditCurveTable({ model }: { model: EditCurveModel }) {
    const curve = useBehavior(model.state.curve);

    if (!curve) {
        return (
            <Box w='full' h='full'>
                No curve built
            </Box>
        );
    }

    return <DilutionCurveTable curve={curve} />;
}
