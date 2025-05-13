import { isRelativelyClose } from '@/lib/util/math';
import { DilutionCurve, DilutionPoint } from '../model/curve';
import { ARPRequest, ARPRequestSample } from '../model/request';
import { arrayMapAdd, setMapAdd } from '@/lib/util/collections';
import { BucketTemplateWell } from '../model/bucket';
import { ARPProductionResult, ProductionPlate, ProductionWell } from '../model/production';
import { PlateUtils } from '../model/plate';

const ConcentrationTolerance = 0.05;
const VolumeTolerance = 0.05;

export function buildRequest(request: ARPRequest) {
    const ctx = new BuilderContext(request);

    const arpInstances = instantiateARPPlates(ctx);

    const arpPlates: ProductionPlate[] = arpInstances.map((arp) => ({
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
                          volume_l: w.point.transfers.reduce((sum, t) => sum + t.volume_l, 0),
                          concentration_m: w.point.target_concentration_m,
                          transfers: w.uses.map((use) => ({
                              source_label: use.source_label ?? '<unknown>',
                              source_well: use.source_well ?? '<unknown>',
                              volume_l: use.volume_l,
                              concentration_m: use.sample.concentration_m,
                          })),
                      }
                    : undefined
            ),
        },
    }));
    const sourcePlates = buildSourcePlates(ctx);

    const result: ARPProductionResult = {
        plates: [...sourcePlates, ...arpPlates],
    };

    return result;
}

class BuilderContext {
    get bucket() {
        return this.request.bucket;
    }

    readonly sampleSouces = new Map<string, SampleSource[]>();
    readonly solvent: SampleSource;

    getCurve(sample_kind: string) {
        return this.request.bucket.sample_info.find((s) => s.kind === sample_kind)?.curve ?? this.request.bucket.curve;
    }

    getSampleSource(sample_id: string, concentration_m: number, total_volume_l: number): SampleSource | undefined {
        const sources = this.sampleSouces.get(sample_id);
        if (sources) {
            for (const src of sources) {
                if (
                    isRelativelyClose(src.concentration_m, concentration_m, ConcentrationTolerance) &&
                    isRelativelyClose(src.total_volume_l, total_volume_l, VolumeTolerance)
                ) {
                    return src;
                }
            }
        }
    }

    initPoint(sample_id: string, point: DilutionPoint, curve: DilutionCurve): SampleSource {
        let sources = this.sampleSouces.get(sample_id);
        if (sources) {
            for (const src of sources) {
                if (isRelativelyClose(src.concentration_m, point.actual_concentration_m, ConcentrationTolerance)) {
                    return src;
                }
            }
        }

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
                throw new Error(`Parent sample not found for concentration ${transfer.concentration_m}M`);
            }
            blueprint.push([parent, transfer.volume_l]);
            depth = Math.max(depth, parent.depth + 1);
        }

        const source: SampleSource = {
            concentration_m: point.target_concentration_m,
            total_volume_l: curve.options.intermediate_volume_l,
            depth,
            blueprint,
            build_uses: [],
            arp_uses: [],
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

    initPoints() {
        for (const sample of this.request.samples) {
            for (const kind of sample.kinds) {
                const curve = this.getCurve(kind);
                if (!curve) {
                    throw new Error(`Curve for sample kind '${kind}' not assigned`);
                }

                this.initCurve(sample.id, curve);
            }
        }
    }

    useARPPoint(sample_id: string, point: DilutionPoint, curve: DilutionCurve): SampleSourceUse[] {
        const uses: SampleSourceUse[] = [];
        for (const xfer of point.transfers) {
            const src = this.getSampleSource(sample_id, xfer.concentration_m, curve.options.intermediate_volume_l);
            if (!src) {
                // TODO: error
                continue;
            }
            const use: SampleSourceUse = { sample: src, volume_l: xfer.volume_l };
            src.arp_uses.push(use);
            uses.push(use);
        }
        return uses;
    }

    useSolvent(volume_l: number) {
        const use: SampleSourceUse = { sample: this.solvent, volume_l };
        this.solvent.arp_uses.push(use);
        return use;
    }

    constructor(public request: ARPRequest) {
        this.solvent = {
            concentration_m: 0,
            total_volume_l:
                this.bucket.curve?.options.intermediate_volume_l ?? this.bucket.source_labware.well_volume_l,
            blueprint: [],
            depth: 0,
            build_uses: [],
            arp_uses: [],
        };

        this.initPoints();
    }
}

interface SampleSourceUse {
    sample: SampleSource;
    volume_l: number;
    source_label?: string;
    source_well?: string;
}

interface SampleInstance {
    source_label?: string;
    source_well_index?: number;
    source_well?: string;
}

interface SampleSource {
    total_volume_l: number;
    concentration_m: number;
    blueprint: [source: SampleSource, volume_l: number][];
    depth: number;
    build_uses: SampleSourceUse[];
    arp_uses: SampleSourceUse[];
}

interface SampleInstance {
    sample_id: string;
    template: BucketTemplateWell;
    curve: DilutionCurve;
    point: DilutionPoint;
    uses: SampleSourceUse[];
}

interface PlateInstance {
    index: number;
    copy: number;
    wells: (SampleInstance | null)[];
}

function instantiateARPPlates(ctx: BuilderContext) {
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
                // TODO: handle error?
                controlsByKind.set(kind, sample);
            }
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

    const arpInstances: PlateInstance[] = [];
    for (let copy = 0; copy < request.n_copies; copy++) {
        let index = 0;
        for (const plateSamples of arpPlatesSamples) {
            const instanceWells: (SampleInstance | null)[] = [];
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
                    template: well,
                    curve,
                    point,
                    uses,
                });
            }

            arpInstances.push({
                copy,
                index: index++,
                wells: instanceWells,
            });
        }
    }

    return arpInstances;
}

function buildSourcePlates(builder: BuilderContext): ProductionPlate[] {
    const wellsByDepth = new Map<number, ProductionWell[]>();

    builder.sampleSouces.forEach((sources, sample_id) => {
        for (const src of sources) {
            // TODO: ...
            if (!src.arp_uses.length) continue;

            arrayMapAdd(wellsByDepth, src.depth, {
                sample_id,
                volume_l: 0, // TODO
                concentration_m: src.concentration_m,
                transfers: [],
            });
        }
    });

    const plates: ProductionPlate[] = [];

    for (const depth of Array.from(wellsByDepth.keys()).sort((a, b) => a - b)) {
        const plate = PlateUtils.empty<ProductionWell>(builder.bucket.intermediate_labware.dimensions);
        const wells = wellsByDepth.get(depth)!;
        let offset = 0;
        // TODO: ordering based on source rack and quadrants for nARP
        PlateUtils.forEachColMajorIndex(plate.dimensions, (idx) => {
            plate.wells[idx] = wells[offset++];
        });
        plates.push({
            kind: 'source',
            index: plates.length,
            label: depth === 0 ? 'nARP' : `Int_P${depth}`,
            plate,
        });
    }

    return plates;
}
