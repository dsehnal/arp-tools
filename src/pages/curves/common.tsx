import { BreadcrumbItem } from '../layout';
import { LuChartNoAxesCombined } from 'react-icons/lu';
import { resolveRoute } from '../routing';
import { ReactNode } from 'react';
import { DilutionCurve, DilutionPoint } from '@/api/model/curve';
import { Table } from '@chakra-ui/react';
import { formatUnit } from '@/lib/util/units';
import { roundValue } from '@/lib/util/math';

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
                        'nARP',
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
