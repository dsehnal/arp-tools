import { isRelativelyClose } from '@/lib/util/math';
import { DilutionCurve, DilutionPoint } from '../model/curve';
import { ARPRequest, ARPRequestSample } from '../model/request';
import { arrayMapAdd, setMapAdd } from '@/lib/util/collections';
import { Bucket, BucketTemplateWell } from '../model/bucket';
import { ARPProductionResult } from '../model/production';

const ConcentrationTolerance = 0.05;
const VolumeTolerance = 0.05;

export interface ARPSampleSourceUse {
    volume_l: number;
    source_label?: string;
    source_well?: string;
}

export interface ARPSampleSource {
    total_volume_l: number;
    concentration_m: number;
    blueprint: [source: ARPSampleSource, volume_l: number][];
    depth: number;
    build_uses: ARPSampleSourceUse[];
    arp_uses: ARPSampleSourceUse[];
}

export class ARPRequestBuilder {
    get bucket() {
        return this.request.bucket;
    }

    readonly sampleSouces = new Map<string, ARPSampleSource[]>();
    readonly solvent: ARPSampleSource;

    getCurve(sample_kind: string) {
        return this.request.bucket.sample_info.find((s) => s.kind === sample_kind)?.curve ?? this.request.bucket.curve;
    }

    getSampleSource(sample_id: string, concentration_m: number, total_volume_l: number): ARPSampleSource | undefined {
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

    initPoint(sample_id: string, point: DilutionPoint, curve: DilutionCurve): ARPSampleSource {
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

        const blueprint: [ARPSampleSource, number][] = [];
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

        const source: ARPSampleSource = {
            concentration_m: point.actual_concentration_m,
            total_volume_l: curve.options.intermediate_volume_l,
            depth,
            blueprint,
            build_uses: [],
            arp_uses: [],
        };
        sources.push(source);
        return source;
    }

    useSample(source: ARPSampleSource, volume_l: number) {
        source.arp_uses.push({ volume_l });
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

    build() {
        this.initPoints();
        const arpInstances = instantiateARPPlates(this.request);

        const result: ARPProductionResult = {
            arp_plates: arpInstances.map(arp => ({
                dimensions: this.bucket.arp_labware.dimensions,
                wells: arp.wells.map(w => w ? ({
                    sample_id: w.sample_id,
                    volume_l: w.point.transfers.reduce((sum, t) => sum + t.volume_l, 0),
                    concentration_M: w.point.actual_concentration_m,
                    transfers: []
                }) : undefined)
            }))
        };

        return result;
    }

    constructor(public request: ARPRequest) {
        this.solvent =  {
        concentration_m: 0,
        total_volume_l: this.bucket.curve?.options.intermediate_volume_l ?? this.bucket.source_labware.well_volume_l,
        blueprint: [],
        depth: 0,
        build_uses: [],
        arp_uses: [],
    };
    }
}

interface ARPSampleInstance {
    sample_id: string;
    template: BucketTemplateWell;
    curve: DilutionCurve;
    point: DilutionPoint;
}

interface ARPPlateInstance {
    wells: (ARPSampleInstance | null)[]
}

function instantiateARPPlates(request: ARPRequest) {
    // Index samples
    const { samples } = request;
    const controlsByKind = new Map<string, ARPRequestSample>();
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
        const { kind, sample_index } = well;
        if (!kind || typeof sample_index !== 'number') continue;
        const info = infos.get(kind);
        if (info?.is_control) {
            templateControlKinds.add(kind);
            continue;
        }
        
        setMapAdd(templateSampleIndexSetByKind, kind, sample_index);
    }

    const templateSampleIndices = Array.from(templateSampleIndexSetByKind.entries()).map(([kind, set]) => [
        kind,
        Array.from(set).sort((a, b) => a - b),
    ] as [string, number[]]);

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
    const arpInstances: ARPPlateInstance[] = [];
    for (const plateSamples of arpPlatesSamples) {
        const instanceWells: (ARPSampleInstance | null)[] = [];
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

            instanceWells.push({
                sample_id: sample.id,
                template: well,
                curve,
                point 
            });
        }

        arpInstances.push({
            wells: instanceWells,
        });
    }

    return arpInstances;
}