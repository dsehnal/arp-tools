import { isRelativelyClose } from '@/lib/util/math';
import { DilutionCurve, DilutionPoint } from '../model/curve';
import { ARPRequest, ARPRequestSample } from '../model/request';
import { arrayMapAdd, setMapAdd } from '@/lib/util/collections';
import { BucketTemplateWell } from '../model/bucket';
import { ProductionResult, ProductionPlate, ProductionWell } from '../model/production';
import { PlateUtils } from '../model/plate';

const ConcentrationTolerance = 0.05;
const VolumeTolerance = 0.05;

export function buildRequest(request: ARPRequest): ProductionResult {
    const ctx = new BuilderContext(request);

    step1_initARPPlates(ctx);
    step2_buildSourceWells(ctx);
    const sourcePlates = step3_buildSourcePlates(ctx);
    const arpPlates = step4_buildARPPlates(ctx, sourcePlates);

    return {
        errors: ctx.errors,
        warnings: ctx.warnings,
        plates: [...sourcePlates, ...arpPlates],
    };
}

class BuilderContext {
    readonly errors: string[] = [];
    readonly warnings: string[] = [];
    readonly arpPlates: ARPPlate[] = [];
    readonly sampleSouces = new Map<string, SampleSource[]>();
    readonly solvent: SampleSource;

    get bucket() {
        return this.request.bucket;
    }

    private _errors = new Set<string>();
    error(message: string) {
        if (this._errors.has(message)) return;
        this._errors.add(message);
        this.errors.push(message);
    }

    private _warnings = new Set<string>();
    warning(message: string) {
        if (this._warnings.has(message)) return;
        this._warnings.add(message);
        this.warnings.push(message);
    }

    getCurve(sample_kind: string) {
        return this.request.bucket.sample_info.find((s) => s.kind === sample_kind)?.curve ?? this.request.bucket.curve;
    }

    getSampleSource(sample_id: string, concentration_m: number, total_volume_l: number): SampleSource | undefined {
        const sources = this.sampleSouces.get(sample_id);
        if (!sources) return;
        for (const src of sources) {
            if (
                isRelativelyClose(src.concentration_m, concentration_m, ConcentrationTolerance) &&
                isRelativelyClose(src.total_volume_l, total_volume_l, VolumeTolerance)
            ) {
                return src;
            }
        }
    }

    initPoint(sample_id: string, point: DilutionPoint, curve: DilutionCurve): SampleSource {
        const existing = this.getSampleSource(
            sample_id,
            point.target_concentration_m,
            curve.options.intermediate_volume_l
        );
        if (existing) {
            return existing;
        }

        let sources = this.sampleSouces.get(sample_id);
        if (!sources) {
            sources = [];
            this.sampleSouces.set(sample_id, sources);
        }

        const blueprint: [SampleSource, number][] = [];
        let depth = 0;
        for (const transfer of point.transfers) {
            const parent = this.getSampleSource(
                sample_id,
                transfer.concentration_m,
                curve.options.intermediate_volume_l
            );
            if (!parent) {
                this.error(`${sample_id}: Source sample not found for concentration ${transfer.concentration_m}M`);
                continue;
            }
            blueprint.push([parent, transfer.volume_l]);
            depth = Math.max(depth, parent.depth + 1);
        }

        const source: SampleSource = {
            id: sample_id,
            concentration_m: point.target_concentration_m,
            total_volume_l: curve.options.intermediate_volume_l,
            depth,
            blueprint,
            wells: [],
            uses: [],
        };
        sources.push(source);
        return source;
    }

    initCurve(sample_id: string, curve: DilutionCurve) {
        this.initPoint(
            sample_id,
            {
                actual_concentration_m: curve.nARP_concentration_M,
                target_concentration_m: curve.nARP_concentration_M,
                transfers: [],
            },
            curve
        );

        for (const xs of curve.intermediate_points) {
            for (const point of xs) {
                this.initPoint(sample_id, point, curve);
            }
        }
    }

    init() {
        // Create source samples
        for (const sample of this.request.samples) {
            for (const kind of sample.kinds) {
                const curve = this.getCurve(kind);
                if (!curve) {
                    this.error(`Curve for sample kind '${kind}' not assigned`);
                    continue;
                }

                this.initCurve(sample.id, curve);
            }
        }

        // Sort desc by depth and concentration
        this.sampleSouces.forEach((sources) => {
            sources.sort((a, b) => {
                const depth = b.depth - a.depth;
                if (depth !== 0) return depth;
                return b.concentration_m - a.concentration_m;
            });
        });
    }

    useARPPoint(sample_id: string, point: DilutionPoint, curve: DilutionCurve): SampleSourceUse[] {
        const uses: SampleSourceUse[] = [];
        for (const xfer of point.transfers) {
            const src = this.getSampleSource(sample_id, xfer.concentration_m, curve.options.intermediate_volume_l);
            if (!src) {
                this.error(`${sample_id}: Source sample not found for concentration ${xfer.concentration_m}M`);
                continue;
            }
            const use: SampleSourceUse = { sample: src, volume_l: xfer.volume_l };
            src.uses.push(use);
            uses.push(use);
        }
        return uses;
    }

    useSample(sample: SampleSource, volume_l: number) {
        const use: SampleSourceUse = { sample, volume_l };
        sample.uses.push(use);
        return use;
    }

    useSolvent(volume_l: number) {
        const use: SampleSourceUse = { sample: this.solvent, volume_l };
        this.solvent.uses.push(use);
        return use;
    }

    constructor(public request: ARPRequest) {
        let solventVolumeL = this.bucket.curve?.options.intermediate_volume_l ?? 0;
        for (const info of this.bucket.sample_info) {
            solventVolumeL = Math.max(solventVolumeL, info.curve?.options.intermediate_volume_l ?? 0);
        }

        this.solvent = {
            id: '<solvent>',
            concentration_m: 0,
            total_volume_l: solventVolumeL,
            blueprint: [],
            depth: -1,
            wells: [],
            uses: [],
        };

        this.init();
    }
}

interface SourceWell {
    sample: SampleSource;
    usage_l: number;
    available_volume_l: number;
    uses: SampleSourceUse[];
    source_label?: string;
    source_well?: string;
    production_well?: ProductionWell;
}

interface SampleSourceUse {
    sample: SampleSource;
    volume_l: number;
    well?: SourceWell;
}

interface SampleSource {
    id: string;
    total_volume_l: number;
    concentration_m: number;
    blueprint: [source: SampleSource, volume_l: number][];
    depth: number;
    wells: SourceWell[];
    uses: SampleSourceUse[];
}

interface ARPWell {
    sample_id: string;
    sample_kind: string;
    template: BucketTemplateWell;
    curve: DilutionCurve;
    point: DilutionPoint;
    uses: SampleSourceUse[];
}

interface ARPPlate {
    index: number;
    copy: number;
    wells: (ARPWell | null)[];
}

function step1_initARPPlates(ctx: BuilderContext) {
    const { request } = ctx;

    // Index samples
    const { samples } = request;
    const controlsByKind = new Map<string, ARPRequestSample>();
    const maxTransferVolumeByKind = new Map<string, number>();
    const byKind = new Map<string, ARPRequestSample[]>();
    const indices = new Map<string, number>();
    const infos = new Map(request.bucket.sample_info.map((info) => [info.kind, info]));
    for (const sample of samples) {
        for (const kind of sample.kinds) {
            arrayMapAdd(byKind, kind, sample);
            indices.set(kind, 0);

            const info = infos.get(kind);
            if (info?.is_control) {
                if (controlsByKind.has(kind)) {
                    ctx.error(
                        `Duplicate control sample for kind '${kind}'. Each control kind can only be specified once.`
                    );
                } else {
                    controlsByKind.set(kind, sample);
                }
            }
        }
    }

    for (const w of request.bucket.template) {
        if (!w) continue;
        const info = infos.get(w.kind!);
        if (info?.is_control && !controlsByKind.has(w.kind!)) {
            ctx.warning(`Control sample for kind '${w.kind}' not found in request samples.`);
        }
    }

    const takeSamples = (kind: string, n: number) => {
        const ret: ARPRequestSample[] = [];

        for (let i = 0; i < n; i++) {
            const index = indices.get(kind)!;
            indices.set(kind, index + 1);
            const s = byKind.get(kind)?.[index];
            if (s) ret.push(s);
        }

        return ret;
    };

    const templateControlKinds = new Set<string>();
    const templateSampleIndexSetByKind = new Map<string, Set<number>>();

    for (const well of request.bucket.template) {
        if (!well) continue;
        const { kind, sample_index, point_index } = well;
        if (!kind || typeof sample_index !== 'number') continue;
        const info = infos.get(kind);
        if (info?.is_control) {
            templateControlKinds.add(kind);
            continue;
        }

        setMapAdd(templateSampleIndexSetByKind, kind, sample_index);

        const curve = info?.curve ?? request.bucket.curve;
        const point = curve?.points[point_index!];
        if (!point) continue;

        const volume = point.transfers.reduce((sum, t) => sum + t.volume_l, 0);
        const maxVolume = maxTransferVolumeByKind.get(kind) ?? 0;
        if (volume > maxVolume) {
            maxTransferVolumeByKind.set(kind, volume);
        }
    }

    const templateSampleIndices = Array.from(templateSampleIndexSetByKind.entries()).map(
        ([kind, set]) => [kind, Array.from(set).sort((a, b) => a - b)] as [string, number[]]
    );

    // Analyze template
    const arpPlatesSamples: Map<string, Map<number, ARPRequestSample>>[] = [];

    while (true) {
        const nextPlate = new Map<string, Map<number, ARPRequestSample>>();

        let isEmpty = true;
        for (const [kind, indices] of templateSampleIndices) {
            const sampleMap = new Map<number, ARPRequestSample>();
            const xs = takeSamples(kind, indices.length);
            for (let i = 0; i < xs.length; i++) {
                sampleMap.set(indices[i], xs[i]);
            }
            nextPlate.set(kind, sampleMap);
            if (xs.length) isEmpty = false;
        }

        if (isEmpty) break;
        arpPlatesSamples.push(nextPlate);
    }

    // Instantiate plates
    const maxGlobalTransferVolumeL = maxTransferVolumeByKind.size
        ? Math.max(...Array.from(maxTransferVolumeByKind.values()))
        : 0;

    for (let copy = 0; copy < request.n_copies; copy++) {
        let index = 0;
        for (const plateSamples of arpPlatesSamples) {
            const instanceWells: (ARPWell | null)[] = [];
            for (const well of request.bucket.template) {
                if (!well) {
                    instanceWells.push(null);
                    continue;
                }

                const { kind, sample_index, point_index } = well;
                if (!kind || typeof point_index !== 'number') {
                    instanceWells.push(null);
                    continue;
                }

                const info = infos.get(kind);
                const curve = info?.curve ?? request.bucket.curve;
                const point = curve?.points[point_index];
                if (!curve || !point) {
                    instanceWells.push(null);
                    continue;
                }

                let sample: ARPRequestSample | undefined;
                if (info?.is_control) {
                    sample = controlsByKind.get(kind);
                } else {
                    sample = plateSamples.get(kind)?.get(sample_index!);
                }

                if (!sample) {
                    instanceWells.push(null);
                    continue;
                }

                const uses = ctx.useARPPoint(sample.id, point, curve);
                const xferVolumeL = point.transfers.reduce((sum, t) => sum + t.volume_l, 0);

                let totalVolume = xferVolumeL;
                if (request.bucket.normalize_solvent === 'per-kind') {
                    const maxVolume = maxTransferVolumeByKind.get(kind) ?? totalVolume;
                    totalVolume = Math.max(totalVolume, maxVolume);
                } else if (request.bucket.normalize_solvent === 'global') {
                    totalVolume = Math.max(totalVolume, maxGlobalTransferVolumeL);
                }

                if (totalVolume > xferVolumeL) {
                    uses.push(ctx.useSolvent(totalVolume - xferVolumeL));
                }

                instanceWells.push({
                    sample_id: sample.id,
                    sample_kind: kind,
                    template: well,
                    curve,
                    point,
                    uses,
                });
            }

            ctx.arpPlates.push({
                copy,
                index: index++,
                wells: instanceWells,
            });
        }
    }
}

function buildSourceWell(ctx: BuilderContext, src: SampleSource) {
    const deadVolumeL = ctx.bucket.source_labware.dead_volume_l;
    const { wells } = src;

    for (const use of src.uses) {
        let well = wells[wells.length - 1];
        if (!well || well.available_volume_l < use.volume_l) {
            well = {
                sample: src,
                usage_l: deadVolumeL,
                available_volume_l: src.total_volume_l - deadVolumeL,
                uses: [],
            };
            wells.push(well);
        }

        use.well = well;
        well.usage_l += use.volume_l;
        well.available_volume_l -= use.volume_l;
    }

    for (const well of wells) {
        for (const [parent, volume_l] of src.blueprint) {
            well.uses.push(ctx.useSample(parent, volume_l));
        }
    }
}

function step2_buildSourceWells(ctx: BuilderContext) {
    for (const sources of Array.from(ctx.sampleSouces.values())) {
        for (const src of sources) {
            buildSourceWell(ctx, src);
        }
    }
    buildSourceWell(ctx, ctx.solvent);
}

function getSourceOrder(ctx: BuilderContext) {
    const samples: [sample: ARPRequestSample, label: string, well: string, row: number, col: number][] = [];
    for (const sample of ctx.request.samples) {
        const [row, col] = sample.source_well ? PlateUtils.labelToCoords(sample.source_well) : [-1, -1];
        samples.push([sample, sample.source_label ?? '<unset>', sample.source_well ?? '<unset>', row, col]);
    }

    samples.sort((a, b) => {
        // label
        if (a[1] !== b[1]) return a[1].localeCompare(b[1]);
        // col
        if (a[4] !== b[4]) return a[4] - b[4];
        // row
        if (a[3] !== b[3]) return a[3] - b[3];
        return a[0].id.localeCompare(b[0].id);
    });

    const ret = new Map<string, [order: number, sample: ARPRequestSample]>();
    for (let i = 0; i < samples.length; i++) {
        const [sample] = samples[i];
        ret.set(sample.id, [i, sample]);
    }
    return ret;
}

function assignProductionWell(ctx: BuilderContext, src: SampleSource, well: SourceWell) {
    const sourceVolumeL =
        src.depth === 0 ? ctx.bucket.source_labware.well_volume_l : ctx.bucket.intermediate_labware.well_volume_l;
    well.production_well = {
        sample_id: src.id,
        volume_l: src.depth === 0 ? Math.min(Math.ceil(well.usage_l * 1e6) / 1e6, sourceVolumeL) : src.total_volume_l,
        concentration_m: src.concentration_m,
        transfers: [],
    };
}

function step3_buildSourcePlates(ctx: BuilderContext): ProductionPlate[] {
    const wellsByDepth = new Map<number, SourceWell[]>();

    const capacity = PlateUtils.size(ctx.bucket.source_labware.dimensions);

    let maxDepth = 0;

    // Group sources well by depth
    for (const sources of Array.from(ctx.sampleSouces.values())) {
        for (const src of sources) {
            maxDepth = Math.max(maxDepth, src.depth);

            for (const well of src.wells) {
                assignProductionWell(ctx, src, well);
                arrayMapAdd(wellsByDepth, src.depth, well);
            }
        }
    }

    for (const well of ctx.solvent.wells) {
        assignProductionWell(ctx, ctx.solvent, well);
    }

    // Find best host for solvent
    let solventDepth = 1;
    for (let depth = 2; depth <= maxDepth; depth++) {
        const bestCount = wellsByDepth.get(depth)?.length ?? Number.MAX_SAFE_INTEGER;

        const count = wellsByDepth.get(depth)?.length;
        if (!count) continue;
        if (bestCount > count) {
            solventDepth = depth;
        }
    }

    if (solventDepth > maxDepth && ctx.solvent.wells.length) {
        ctx.warning('Solvent normalization is currently only supported for curves with intermediate plates.');
    }

    // Build the plates
    const plates: ProductionPlate[] = [];
    const sourceMap = getSourceOrder(ctx);
    const labelToIndex = new Map<string, number>();

    for (let depth = 0; depth <= maxDepth; depth++) {
        let wells = wellsByDepth.get(depth);
        if (!wells?.length) continue;

        if (depth === 0) {
            wells.sort((a, b) => {
                return sourceMap.get(a.sample.id)![0] - sourceMap.get(b.sample.id)![0];
            });
        }

        if (depth === solventDepth) {
            wells = [...wells, ...ctx.solvent.wells];
        }

        if (wells.length > capacity) {
            ctx.error(`Too many wells for depth ${depth}: ${wells.length} wells, capacity ${capacity} wells`);
            continue;
        }

        const label = depth === 0 ? 'Source' : `Int_P${depth}`;
        const plate = PlateUtils.empty<ProductionWell>(ctx.bucket.intermediate_labware.dimensions);

        let offset = 0;
        PlateUtils.forEachColMajorIndex(
            plate.dimensions,
            (idx, row, col) => {
                const w = wells[offset++];
                if (!w) return;

                w.source_label = label;
                w.source_well = PlateUtils.wellLabel(row, col);

                plate.wells[idx] = w.production_well!;
            },
            { byQuadrant: depth === 0 }
        );

        labelToIndex.set(label, plates.length);
        plates.push({
            kind: depth === 0 ? 'source' : 'intermediate',
            index: plates.length,
            label,
            plate,
        });
    }

    // Add transfers to production wells
    if (plates[0]) {
        for (const well of plates[0].plate.wells) {
            if (!well) continue;
            const src = sourceMap.get(well.sample_id);
            if (!src) continue;

            const srcLabel = src[1]?.source_label;
            const srcWell = src[1]?.source_well;

            if (!srcLabel || !srcWell) {
                ctx.error(`${well.sample_id}: Source location not assigned`);
            }

            well.transfers.push({
                source_plate_index: -1,
                source_label: src[1]?.source_label ?? '<unknown>',
                source_well: src[1]?.source_well ?? '<unknown>',
                volume_l: well.volume_l,
                concentration_m: well.concentration_m,
            });
        }
    }

    for (const sources of Array.from(ctx.sampleSouces.values())) {
        for (const src of sources) {
            for (const well of src.wells) {
                if (!well.production_well) continue;

                for (const use of well.uses) {
                    well.production_well.transfers.push({
                        source_plate_index: labelToIndex.get(use.well?.source_label ?? '') ?? 0,
                        source_label: use.well?.source_label ?? '<unknown>',
                        source_well: use.well?.source_well ?? '<unknown>',
                        volume_l: use.volume_l,
                        concentration_m: use.sample.concentration_m,
                    });
                }
            }
        }
    }

    return plates;
}

function step4_buildARPPlates(ctx: BuilderContext, sourcePlates: ProductionPlate[]): ProductionPlate[] {
    const labelToIndex = new Map(sourcePlates.map((plate, index) => [plate.label, index]));
    return ctx.arpPlates.map(
        (arp) =>
            ({
                kind: 'arp',
                label: `ARP_P${arp.index + 1}-C${arp.copy + 1}`,
                index: arp.index,
                copy: arp.copy,
                plate: {
                    dimensions: ctx.bucket.arp_labware.dimensions,
                    wells: arp.wells.map((w) =>
                        w
                            ? {
                                  sample_id: w.sample_id,
                                  sample_kind: w.sample_kind,
                                  volume_l: w.point.transfers.reduce((sum, t) => sum + t.volume_l, 0),
                                  concentration_m: w.point.target_concentration_m,
                                  transfers: w.uses.map((use) => ({
                                      source_plate_index: labelToIndex.get(use.well?.source_label ?? '') ?? 0,
                                      source_label: use.well?.source_label ?? '<unknown>',
                                      source_well: use.well?.source_well ?? '<unknown>',
                                      volume_l: use.volume_l,
                                      concentration_m: use.sample.concentration_m,
                                  })),
                              }
                            : undefined
                    ),
                },
            }) satisfies ProductionPlate
    );
}
