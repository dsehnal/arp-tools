import {
    CurvePoints,
    DilutionCurve,
    DilutionCurveOptions,
    DilutionPoint,
    DilutionTransfer,
    IntermediateConcentrations,
} from './model/curve';

function getCurvePoints(options: DilutionCurveOptions): CurvePoints {
    const ret = new Array(options.n_points);
    ret[0] = options.top_concentration_m;

    for (let i = 1; i < options.n_points; i++) {
        ret[i] = ret[i - 1] / options.dilution_factor;
    }

    for (let i = 0; i < options.n_points; i++) {
        ret[i] = Math.round(1e15 * ret[i]) / 1e15;
    }

    return ret;
}

interface ExploreState {
    options: DilutionCurveOptions;
    curve: CurvePoints;
    bestScore: number;
    bestIntermediates: IntermediateConcentrations;
}

function alias(
    options: DilutionCurveOptions,
    isIntermediate: boolean,
    minDepth: number,
    maxDepth: number,
    concentrations: IntermediateConcentrations,
    value: number,
    xfers: DilutionTransfer[] | undefined
) {
    const { adjust_intermediate_volume, min_transfer_volume_l, droplet_size_l, tolerance, single_source_transfers } =
        options;

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

    for (let o = minDepth; o <= maxDepth; o++) {
        for (const src of concentrations[o]) {
            let t: number;

            if (isIntermediate && adjust_intermediate_volume) {
                t =
                    (value * targetVolumeL +
                        value * min_transfer_volume_l +
                        value * currentVolume -
                        running -
                        src * min_transfer_volume_l) /
                    (src * droplet_size_l - value * droplet_size_l);
            } else {
                t =
                    (value * targetVolumeL - running - src * min_transfer_volume_l) /
                    (src * droplet_size_l - value * droplet_size_l);
            }

            const maxDrops = Math.ceil((maxTransferVolumeL - min_transfer_volume_l - currentVolume) / droplet_size_l);

            if (maxDrops <= 0) {
                done = true;
                break;
            }

            if (t < 0) t = 0;
            else if (t > maxDrops) t = maxDrops;

            const tLow = Math.floor(t);
            const tHigh = Math.ceil(t);

            const cLow =
                (running + src * (min_transfer_volume_l + tLow * droplet_size_l)) /
                (adjust_intermediate_volume
                    ? currentVolume + min_transfer_volume_l + tLow * droplet_size_l + targetVolumeL
                    : targetVolumeL);
            const cHigh =
                (running + src * (min_transfer_volume_l + tHigh * droplet_size_l)) /
                (adjust_intermediate_volume
                    ? currentVolume + min_transfer_volume_l + tHigh * droplet_size_l + targetVolumeL
                    : targetVolumeL);

            const isNextLow = Math.abs(cLow - value) < Math.abs(cHigh - value);
            const nextConc = isNextLow ? cLow : cHigh;
            const nextT = isNextLow ? tLow : tHigh;

            if (nextConc < upperBound) {
                const volume_l = min_transfer_volume_l + nextT * droplet_size_l;
                aliasedConc = nextConc;
                currentVolume += volume_l;
                running += src * volume_l;

                if (xfers) {
                    xfers.push({ concentration_m: src, volume_l });
                }
            }

            if (aliasedConc > lowerBound) {
                done = true;
                break;
            }
        }

        if (single_source_transfers && currentVolume > 0) break;
        if (done) break;
    }

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

function evaluateFinal(state: ExploreState): DilutionCurve {
    const { options, curve, bestIntermediates: concentrations } = state;

    const intermediates: DilutionPoint[][] = [];
    const points: DilutionPoint[] = [];

    for (let d = 1; d < concentrations.length; d++) {
        const xs: DilutionPoint[] = [];
        intermediates.push(xs);

        for (const conc of concentrations[d]) {
            const xfers: DilutionTransfer[] = [];
            const aliased = alias(options, true, d - 1, d - 1, concentrations, conc, xfers);

            xs.push({
                target_concentration_m: aliased,
                actual_concentration_m: aliased,
                transfers: xfers,
            });
        }
    }

    for (const pt of curve) {
        const xfers: DilutionTransfer[] = [];
        const aliased = alias(options, false, 0, concentrations.length - 1, concentrations, pt, xfers);
        points.push({
            target_concentration_m: pt,
            actual_concentration_m: aliased,
            transfers: xfers,
        });
    }

    const result: DilutionCurve = {
        options,
        nARP_concentration_M: options.source_concentration_m,
        intermediate_points: intermediates,
        points,
    };

    return result;
}

export function findCurve(options: DilutionCurveOptions) {
    const curve = getCurvePoints(options);
    const state: ExploreState = { curve, options, bestScore: Number.POSITIVE_INFINITY, bestIntermediates: [] };
    explore(state, 1, [[options.source_concentration_m], []]);
    return evaluateFinal(state);
}
