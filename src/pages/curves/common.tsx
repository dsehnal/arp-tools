import { DialogService } from '@/lib/services/dialog';
import { DilutionCurve, DilutionPoint, writeCurve } from '@/lib/tools/model/curve';
import { download } from '@/lib/util/download';
import { roundValue } from '@/lib/util/math';
import { formatUnit } from '@/lib/util/units';
import { Box, Flex, Table } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { LuChartNoAxesCombined } from 'react-icons/lu';
import { BreadcrumbItem } from '../layout';
import { resolveRoute } from '../routing';

export const CurvesBreadcrumb: BreadcrumbItem = {
    icon: <LuChartNoAxesCombined />,
    title: 'Curves',
    path: 'curves',
};

export function curveBreadcrumb({
    id,
    name,
    isLoading,
}: {
    isLoading?: boolean;
    id?: string;
    name?: ReactNode;
}): BreadcrumbItem | undefined {
    if (isLoading) return { title: 'Loading...' };
    if (!id) return undefined;
    return {
        title: name ?? id,
        path: resolveRoute(CurvesBreadcrumb.path!, id),
    };
}

export function DilutionCurveTable({ curve }: { curve: DilutionCurve }) {
    const pt = (name: string, p: DilutionPoint, dmso = false, error = true) => {
        const xferVolume = p.transfers.reduce((acc, t) => acc + t.volume_l, 0);
        const dmsoPercent = (100 * xferVolume) / curve.options.assay_volume_l;

        const errorValue = Math.abs((p.target_concentration_m - p.actual_concentration_m) / p.target_concentration_m);
        return (
            <Table.Row key={name}>
                <Table.Cell>{name}</Table.Cell>
                <Table.Cell>{formatUnit(p.target_concentration_m, 'M')}</Table.Cell>
                <Table.Cell>{formatUnit(p.actual_concentration_m, 'M')}</Table.Cell>
                <Table.Cell color={errorValue > curve.options.tolerance ? 'red' : undefined}>
                    {error && `${roundValue(100 * errorValue, 2)} %`}
                </Table.Cell>
                <Table.Cell>{dmso && `${roundValue(dmsoPercent, 2)} %`}</Table.Cell>
                <Table.Cell>
                    {p.transfers.length > 0 && (
                        <>
                            [
                            {p.transfers
                                .map((t) => `${formatUnit(t.volume_l, 'L')}@${formatUnit(t.concentration_m, 'M')}`)
                                .join(', ')}
                            ]
                        </>
                    )}
                </Table.Cell>
            </Table.Row>
        );
    };

    return (
        <Table.ScrollArea borderWidth='1px' w='100%' h='100%'>
            <Table.Root size='sm' stickyHeader showColumnBorder interactive>
                <Table.Header>
                    <Table.Row bg='bg.subtle'>
                        <Table.ColumnHeader>Point</Table.ColumnHeader>
                        <Table.ColumnHeader>Target</Table.ColumnHeader>
                        <Table.ColumnHeader>Actual</Table.ColumnHeader>
                        <Table.ColumnHeader>Error</Table.ColumnHeader>
                        <Table.ColumnHeader>DMSO</Table.ColumnHeader>
                        <Table.ColumnHeader>Transfers</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>

                <Table.Body>
                    {pt(
                        'Source',
                        {
                            actual_concentration_m: curve.nARP_concentration_M,
                            target_concentration_m: curve.nARP_concentration_M,
                            transfers: [],
                        },
                        undefined,
                        false
                    )}
                    {curve.intermediate_points.flatMap((points, i) =>
                        points.map((p, j) => pt(`Int ${i + 1}-${j + 1}`, p, undefined, false))
                    )}
                    {curve.points.map((p, i) => pt(`${i + 1}`, p, true))}
                </Table.Body>
            </Table.Root>
        </Table.ScrollArea>
    );
}

export function downloadCurve(curve: DilutionCurve, name?: string) {
    const data = writeCurve(curve);
    download(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
        `curve-${name || curve.name || Date.now()}.json`
    );
}

export function showCurveDetails(curve: DilutionCurve) {
    return DialogService.show({
        title: curve.name ?? 'Curve Details',
        options: { size: 'xl', noFooter: true },
        body: CurveDetailsDialogContent,
        model: curve,
    });
}

function CurveProperty({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Box>
            <Box fontWeight='bold' fontSize='xs' color='gray.500'>
                {label}
            </Box>
            <Box>{children}</Box>
        </Box>
    );
}

function CurveDetailsDialogContent({ model }: { model: DilutionCurve }) {
    return (
        <Flex gap={2}>
            <Box flexGrow={1} h='20rem' pos='relative'>
                <DilutionCurveTable curve={model} />
            </Box>
            <Box flexGrow={1} h='20rem' overflow='hidden' overflowY='auto'>
                <CurveProperty label='Source Concentration'>
                    {formatUnit(model.nARP_concentration_M, 'M', { compact: true })}
                </CurveProperty>
                <CurveProperty label='Intermediate Volume'>
                    {formatUnit(model.options.intermediate_volume_l, 'L', { compact: true })}
                </CurveProperty>
                <CurveProperty label='Assay Volume'>
                    {formatUnit(model.options.assay_volume_l, 'L', { compact: true })}
                </CurveProperty>
                <CurveProperty label='Top Concentration'>
                    {formatUnit(model.options.top_concentration_m, 'M', { compact: true })}
                </CurveProperty>
                <CurveProperty label='Dilution Factor'>{roundValue(model.options.dilution_factor, 6)}</CurveProperty>
            </Box>
        </Flex>
    );
}
