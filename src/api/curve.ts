import {
    DilutionCurveOptions,
    CurvePoints,
    IntermediateConcentrations,
    DilutionTransfer,
    DilutionCurve,
    DilutionPoint,
} from './model/curve';
import { formatConc, roundNano, toNano } from '../utils';

function getCurvePoints(options: DilutionCurveOptions): CurvePoints {
    const ret = new Array(options.n_points);
    ret[0] = options.top_concentration_m;

    for (let i = 1; i < options.n_points; i++) {
        ret[i] = ret[i - 1] / options.dilution_factor;
    }

    for (let i = 0; i < options.n_points; i++) {
        ret[i] = Math.round(1e9 * ret[i]) / 1e9;
    }

    return ret;
}

interface ExploreState {
    options: DilutionCurveOptions;
    curve: CurvePoints;
    bestScore: number;
    bestIntermediates: IntermediateConcentrations;
}

export function alias(
    options: DilutionCurveOptions,
    isIntermediate: boolean,
    minDepth: number,
    maxDepth: number,
    concentrations: IntermediateConcentrations,
    value: number,
    xfers: DilutionTransfer[] | undefined
) {
    const {
        adjust_intermediate_volume: adjustIntermediateVolume,
        min_transfer_volume_l: minTransferVolumeL,
        droplet_size_l: dropletSizeL,
        tolerance,
    } = options;

    const targetVolumeL = isIntermediate ? options.intermediate_volume_l : options.assay_volume_l;
    const maxTransferVolumeL = isIntermediate
        ? options.max_intermediate_transfer_volume_l
        : options.max_transfer_volume_l;

    const lowerBound = value * (1 - tolerance);
    const upperBound = value * (1 + tolerance);

    let aliasedConc = 0;
    let currentVolume = 0;
    let running = 0;

    let done = false;

    // console.log('[target]', toNM(value), 'nM');

    for (let o = minDepth; o <= maxDepth; o++) {
        for (const src of concentrations[o]) {
            // TODO: support "adjust intermediate volume: false"

            let t: number;

            if (adjustIntermediateVolume) {
                // console.log('adjusting');
                t =
                    (value * targetVolumeL +
                        value * minTransferVolumeL +
                        value * currentVolume -
                        running -
                        src * minTransferVolumeL) /
                    (src * dropletSizeL - value * dropletSizeL);
            } else {
                // console.log('not adjusting');
                t =
                    (value * targetVolumeL - running - src * minTransferVolumeL) /
                    (src * dropletSizeL - value * dropletSizeL);
            }

            const maxDrops = Math.ceil((maxTransferVolumeL - minTransferVolumeL - currentVolume) / dropletSizeL);

            if (maxDrops <= 0) {
                done = true;
                break;
            }

            if (t < 0) t = 0;
            else if (t > maxDrops) t = maxDrops;

            const tLow = Math.floor(t);
            const tHigh = Math.ceil(t);

            const cLow =
                (running + src * (minTransferVolumeL + tLow * dropletSizeL)) /
                (adjustIntermediateVolume
                    ? currentVolume + minTransferVolumeL + tLow * dropletSizeL + targetVolumeL
                    : targetVolumeL);
            const cHigh =
                (running + src * (minTransferVolumeL + tHigh * dropletSizeL)) /
                (adjustIntermediateVolume
                    ? currentVolume + minTransferVolumeL + tHigh * dropletSizeL + targetVolumeL
                    : targetVolumeL);

            // console.log(formatConc(src), 'drops', t, { tLow, tHigh }, maxDrops);
            // console.log(formatConc(cLow), formatConc(cHigh));

            const isNextLow = Math.abs(cLow - value) < Math.abs(cHigh - value);
            const nextConc = isNextLow ? cLow : cHigh;
            const nextT = isNextLow ? tLow : tHigh;

            if (nextConc < upperBound) {
                aliasedConc = nextConc;
                currentVolume += minTransferVolumeL + nextT * dropletSizeL;
                running += src * (minTransferVolumeL + nextT * dropletSizeL);

                // console.log('xfer', formatConc(src), Math.round(1e9 * (minTransferVolumeL + nextT * dropletSizeL)), 'nL');
                if (xfers) {
                    xfers.push({ concentration_M: src, volume_l: minTransferVolumeL + nextT * dropletSizeL });
                }
            }

            if (aliasedConc > lowerBound) {
                done = true;
                break;
            }
        }

        if (done) break;
    }

    // round to nM
    aliasedConc = roundNano(aliasedConc);

    // console.log('[aliased]', toNM(aliasedConc), 'nM')

    return aliasedConc;
}

function evaluateFast(state: ExploreState, depth: number, concentrations: IntermediateConcentrations) {
    const { options, curve } = state;

    let maxErr = 0;

    for (const pt of curve) {
        const aliased = alias(options, false, 0, depth, concentrations, pt, undefined);
        const err = (pt - aliased) / pt;
        if (Math.abs(err) > maxErr) maxErr = Math.abs(err);
    }
    return maxErr;
}

function explore(state: ExploreState, depth: number, concentrations: IntermediateConcentrations) {
    const { options } = state;
    const sourceConcentrations = concentrations[depth - 1];
    const latest: number[] = concentrations[depth];

    // console.log(concentrations);

    const maxErr = evaluateFast(state, depth, concentrations);
    if (state.bestScore > maxErr) {
        state.bestScore = maxErr;
        state.bestIntermediates = concentrations.map((c) => [...c]);
    }

    if (depth > options.max_intermadiate_plates) {
        return;
    }

    if (latest.length >= options.max_intermediate_points_per_plate) {
        concentrations.push([]);
        explore(state, depth + 1, concentrations);
        concentrations.pop();
        return;
    }

    const upperBound = Math.min(
        (sourceConcentrations[0] * options.max_intermediate_transfer_volume_l) /
            ((options.adjust_intermediate_volume ? options.max_intermediate_transfer_volume_l : 0) +
                options.intermediate_volume_l),
        sourceConcentrations[sourceConcentrations.length - 1] / 10
    );
    const lowerBound =
        (sourceConcentrations[sourceConcentrations.length - 1] * options.min_transfer_volume_l) /
        ((options.adjust_intermediate_volume ? options.min_transfer_volume_l : 0) + options.intermediate_volume_l);

    const offset = latest.length;
    const delta = (upperBound - lowerBound) / (options.num_intermediate_point_samples - 1);

    const start =
        latest.length === 0
            ? options.num_intermediate_point_samples - 1
            : Math.floor((0.9 * latest[latest.length - 1] - lowerBound) / delta);

    latest.push(0);

    for (let i = start; i >= 0; i--) {
        const next = lowerBound + i * delta;
        const aliased = alias(options, true, depth - 1, depth - 1, concentrations, next, undefined);
        if (aliased < 1e-10) break;
        latest[offset] = aliased;
        explore(state, depth, concentrations);
    }

    latest.pop();
}

interface _CurvePrintPoint {
    pt: string;
    target: string;
    actual: string | null;
    error: number | string;
    transfers: string;
}

function evaluateFinal(state: ExploreState): [_CurvePrintPoint[], DilutionCurve] {
    const { options, curve, bestIntermediates: concentrations } = state;
    const printPoints: _CurvePrintPoint[] = [];

    const intermediates: DilutionPoint[][] = [];
    const points: DilutionPoint[] = [];

    printPoints.push({
        pt: 'nARP',
        target: formatConc(concentrations[0][0]),
        actual: '-',
        error: '-',
        transfers: '',
    });

    for (let d = 1; d < concentrations.length; d++) {
        const xs: DilutionPoint[] = [];
        intermediates.push(xs);

        for (const conc of concentrations[d]) {
            const xfers: DilutionTransfer[] = [];
            alias(options, true, d - 1, d - 1, concentrations, conc, xfers);

            printPoints.push({
                pt: `Int ${d}`,
                target: formatConc(conc),
                actual: '-',
                error: '-',
                transfers: `${xfers.map(({ concentration_M: c, volume_l: v }) => `[${toNano(v)} nL@${formatConc(c)}]`).join(', ')}`,
            });

            xs.push({
                target_concentration_M: conc,
                actual_concentration_M: conc,
                transfers: xfers,
            });
        }
    }

    let idx = 1;
    for (const pt of curve) {
        const xfers: DilutionTransfer[] = [];
        const aliased = alias(options, false, 0, concentrations.length - 1, concentrations, pt, xfers);
        const err = Math.abs((pt - aliased) / pt);
        printPoints.push({
            pt: `Pt ${idx++}`,
            target: formatConc(pt),
            actual: formatConc(aliased),
            error: `${Math.round(1000 * err) / 10} %`,
            transfers: `${xfers.map(({ concentration_M: c, volume_l: v }) => `[${toNano(v)} nL@${formatConc(c)}]`).join(', ')}`,
        });

        points.push({
            target_concentration_M: pt,
            actual_concentration_M: aliased,
            transfers: xfers,
        });
    }

    const result: DilutionCurve = {
        options,
        nARP_concentration_M: options.nARP_concentration_M,
        intermediate_points: intermediates,
        points,
    };

    return [printPoints, result];
}

export function findCurve(options: DilutionCurveOptions) {
    const curve = getCurvePoints(options);
    const state: ExploreState = { curve, options, bestScore: Number.POSITIVE_INFINITY, bestIntermediates: [] };
    explore(state, 1, [[options.nARP_concentration_M], []]);

    const [, result] = evaluateFinal(state);

    // console.log(state.bestIntermediates);
    // console.table(options);
    // console.table(result);
    return result;
}
