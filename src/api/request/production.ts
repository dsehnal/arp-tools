import { isRelativelyClose } from '@/lib/util/math';
import { DilutionCurve, DilutionPoint } from '../model/curve';
import { ARPRequest } from '../model/request';

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
    readonly solvent: ARPSampleSource = {
        concentration_m: 0,
        total_volume_l: this.bucket.curve?.options.intermediate_volume_l ?? this.bucket.source_labware.well_volume_l,
        blueprint: [],
        depth: 0,
        build_uses: [],
        arp_uses: [],
    };

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

    constructor(public request: ARPRequest) {}
}
