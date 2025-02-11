import { ReactiveModel } from '@/lib/reactive-model';
import { DefaultCurveOptions, DilutionCurve, DilutionCurveOptions, DilutionPoint } from '@/model/curve';
import { BehaviorSubject } from 'rxjs';
import { CurvesApi } from './api';
import { useParams } from 'react-router';
import { useAsyncModel } from '@/lib/hooks/use-async-model';
import { Box, Button, HStack, Table, VStack } from '@chakra-ui/react';
import { SmartFormatters, SmartInput, SmartParsers } from '@/lib/components/input';
import { Field } from '@/components/ui/field';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { Switch } from '@/components/ui/switch';
import { findCurve } from '@/lib/curve';
import { formatConc, roundValue, toNano } from '@/utils';
import { toaster } from '@/components/ui/toaster';
import { AsyncWrapper } from '@/lib/components/async-wrapper';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';

class EditCurveModel extends ReactiveModel {
    state = {
        name: new BehaviorSubject<string>('Unnamed Curve'),
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
        if (!this.curve) return;
        const curve = { ...this.curve, name: this.state.name.value, id: this.id };
        await CurvesApi.save(curve);
        toaster.create({
            title: 'Saved...',
            duration: 2000,
            type: 'success',
        });
    };

    async init() {
        const curve = await CurvesApi.get(this.id);
        if (curve) {
            this.state.curve.next(curve);
            this.state.name.next(curve.name ?? '');
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

    return <AsyncWrapper loading={!model || loading} error={error}>
        <EditCurve model={model!} />
    </AsyncWrapper>;
}

function EditCurve({ model }: { model: EditCurveModel }) {
    useReactiveModel(model);
    return (
        <HStack h='100%' position='relative'>
            <Box
                gap={1}
                minW={400}
                maxW={400}
                w={400}
                borderRightWidth={1}
                pe={2}
                h='100%'
                overflow='hidden'
                overflowY='auto'
            >
                <EditCurveOptions model={model} />
            </Box>
            <EditCurveTable model={model} />
        </HStack>
    );
}

function EditCurveOptions({ model }: { model: EditCurveModel }) {
    const options = useBehavior(model.state.options);
    const name = useBehavior(model.state.name);
    return (
        <VStack gap={1}>
            <Button w='100%' onClick={model.build} size='sm' colorPalette='blue'>
                Build
            </Button>
            <Field label='Name'>
                <SmartInput value={name} onChange={(v) => model.state.name.next(v)} index={0} sm />
            </Field>
            <Field label='nARP Concentration (mM)'>
                <SmartInput
                    value={options.nARP_concentration_M}
                    format={SmartFormatters.unit(1e3)}
                    parse={SmartParsers.unit(1e-3)}
                    onChange={(v) => model.update({ nARP_concentration_M: v })}
                    index={1}
                    sm
                />
            </Field>
            <Field label='Intermediate Volume (uL)'>
                <SmartInput
                    value={options.intermediate_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-7)}
                    onChange={(v) => model.update({ intermediate_volume_l: v })}
                    index={2}
                    sm
                />
            </Field>
            <Field label='Assay Volume (uL)'>
                <SmartInput
                    value={options.assay_volume_l}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-6)}
                    onChange={(v) => model.update({ assay_volume_l: v })}
                    index={3}
                    sm
                />
            </Field>
            <Field label='Max Intermediate Plates'>
                <SmartInput
                    value={options.max_intermadiate_plates}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ max_intermadiate_plates: v })}
                    index={4}
                    sm
                />
            </Field>
            <Field label='Max Points per Plate'>
                <SmartInput
                    value={options.max_intermediate_points_per_plate}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ max_intermediate_points_per_plate: v })}
                    index={5}
                    sm
                />
            </Field>
            <Field label='Top Concentration (uM)'>
                <SmartInput
                    value={options.top_concentration_m}
                    format={SmartFormatters.unit(1e6)}
                    parse={SmartParsers.unit(1e-6)}
                    onChange={(v) => model.update({ top_concentration_m: v })}
                    index={6}
                    sm
                />
            </Field>
            <Field label='Number of Points'>
                <SmartInput
                    value={options.num_points}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ num_points: v })}
                    index={7}
                    sm
                />
            </Field>
            <Field label='Dilution Factor'>
                <SmartInput
                    value={options.dilution_factor}
                    format={SmartFormatters.unit(1, 6)}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ dilution_factor: v })}
                    index={8}
                    sm
                />
            </Field>
            <Field label='Tolerance (%)'>
                <SmartInput
                    value={options.tolerance}
                    format={SmartFormatters.unit(1e2)}
                    parse={SmartParsers.unit(1e-2)}
                    onChange={(v) => model.update({ tolerance: v })}
                    index={9}
                    sm
                />
            </Field>
            <Field label='Adjust Intermediate Volume'>
                <Switch
                    size='sm'
                    checked={options.adjust_intermediate_volume}
                    onCheckedChange={(e) => model.update({ adjust_intermediate_volume: e.checked })}
                />
            </Field>
            <Field label='Min Transfer Volume (nL)'>
                <SmartInput
                    value={options.min_transfer_volume_l}
                    format={SmartFormatters.unit(1e9)}
                    parse={SmartParsers.unit(1e-9)}
                    onChange={(v) => model.update({ min_transfer_volume_l: v })}
                    index={10}
                    sm
                />
            </Field>
            <Field label='Max Transfer Volume (nL)'>
                <SmartInput
                    value={options.max_transfer_volume_l}
                    format={SmartFormatters.unit(1e9)}
                    parse={SmartParsers.unit(1e-9)}
                    onChange={(v) => model.update({ max_transfer_volume_l: v })}
                    index={11}
                    sm
                />
            </Field>
            <Field label='Max Intermediate Transfer Volume (nL)'>
                <SmartInput
                    value={options.max_intermediate_transfer_volume_l}
                    format={SmartFormatters.unit(1e9)}
                    parse={SmartParsers.unit(1e-9)}
                    onChange={(v) => model.update({ max_intermediate_transfer_volume_l: v })}
                    index={12}
                    sm
                />
            </Field>
            <Field label='Droplet Size (nL)'>
                <SmartInput
                    value={options.droplet_size_l}
                    format={SmartFormatters.unit(1e9)}
                    parse={SmartParsers.unit(1e-9)}
                    onChange={(v) => model.update({ droplet_size_l: v })}
                    index={13}
                    sm
                />
            </Field>
            <Field label='Number of Intermediate Point Samples'>
                <SmartInput
                    value={options.num_intermediate_point_samples}
                    parse={SmartParsers.number}
                    onChange={(v) => model.update({ num_intermediate_point_samples: v })}
                    index={14}
                    sm
                />
            </Field>
        </VStack>
    );
}

function EditCurveTable({ model }: { model: EditCurveModel }) {
    const curve = useBehavior(model.state.curve);

    if (!curve) {
        return <Box>No curve computed</Box>;
    }

    const pt = (name: string, p: DilutionPoint) => (
        <Table.Row key={name}>
            <Table.Cell>{name}</Table.Cell>
            <Table.Cell>{formatConc(p.target_concentration_m)}</Table.Cell>
            <Table.Cell>{formatConc(p.actual_concentration_m)}</Table.Cell>
            <Table.Cell>
                {roundValue(
                    100 * Math.abs((p.target_concentration_m - p.actual_concentration_m) / p.target_concentration_m),
                    2
                )}{' '}
                %
            </Table.Cell>
            <Table.Cell>
                {p.transfers.length > 0 &&
                    p.transfers.map((t) => `[${toNano(t.volumeL)} nL@${formatConc(t.concentration_m)}]`).join(', ')}
            </Table.Cell>
        </Table.Row>
    );

    return (
        <Box w='100%' h='100%' overflow='hidden'>
            <Table.ScrollArea borderWidth='1px' w='100%'>
                <Table.Root size='sm' stickyHeader>
                    <Table.Header>
                        <Table.Row bg='bg.subtle'>
                            <Table.ColumnHeader>Pt</Table.ColumnHeader>
                            <Table.ColumnHeader>Target</Table.ColumnHeader>
                            <Table.ColumnHeader>Actual</Table.ColumnHeader>
                            <Table.ColumnHeader>Error</Table.ColumnHeader>
                            <Table.ColumnHeader>Transfers</Table.ColumnHeader>
                        </Table.Row>
                    </Table.Header>

                    <Table.Body>
                        {pt('nARP', {
                            actual_concentration_m: curve.nARP_concentration_m,
                            target_concentration_m: curve.nARP_concentration_m,
                            transfers: [],
                        })}
                        {curve.intermediate_points.flatMap((points, i) => points.map((p) => pt(`Int ${i + 1}`, p)))}
                        {curve.points.map((p, i) => pt(`${i + 1}`, p))}
                    </Table.Body>
                </Table.Root>
            </Table.ScrollArea>
            <Button size='sm' w='100%' mt={2} colorPalette='blue' onClick={model.save}>
                Save
            </Button>
        </Box>
    );
}
