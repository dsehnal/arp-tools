import { Field } from '@/components/ui/field';
import { SmartInput } from '@/lib/components/input';
import { SimpleSelect } from '@/lib/components/select';
import { useBehavior } from '@/lib/hooks/use-behavior';
import { useReactiveModel } from '@/lib/hooks/use-reactive-model';
import { PlateModel, PlateVisual } from '@/lib/plate';
import { ReactiveModel } from '@/lib/reactive-model';
import { arrayMapAdd, resizeArray } from '@/lib/util/array';
import { Bucket, BucketTemplateWell, DefaultBucket, getBucketTemplateWellKey } from '@/model/bucket';
import { PlateDimensions, PlateUtils } from '@/model/plate';
import {
    Box,
    Button,
    FileUploadRoot,
    FileUploadTrigger,
    Flex,
    HStack,
    Input,
    VStack
} from '@chakra-ui/react';
import * as d3c from 'd3-scale-chromatic';
import { useRef } from 'react';
import { HiUpload } from 'react-icons/hi';
import { BehaviorSubject, distinctUntilKeyChanged } from 'rxjs';

class EditBucketModel extends ReactiveModel {
    state = {
        bucket: new BehaviorSubject(DefaultBucket),
    };

    get bucket() {
        return this.state.bucket.value;
    }

    get template() {
        return this.state.bucket.value.template;
    }

    plate = new PlateModel(DefaultBucket.template.dimensions);

    update(next: Partial<Bucket>) {
        this.state.bucket.next({ ...this.bucket, ...next });
    }

    private syncPlate() {
        const { template } = this;

        const keys = new Map<string, number>();

        for (const well of template.wells) {
            const key = getBucketTemplateWellKey(well);
            if (!keys.has(key!)) {
                keys.set(key!, keys.size);
            }
        }

        this.plate.update(
            {
                colors: template.wells.map((w) => {
                    const key = getBucketTemplateWellKey(w);
                    if (!key) return undefined;
                    return d3c.interpolateWarm(keys.get(key)! / (keys.size - 1 || 1));
                }),
                labels: template.wells.map((w) => {
                    if (!w) return undefined;

                    let ret = '';
                    if (w.kind) ret += w.kind;
                    else if (typeof w.sample_index === 'number') ret += `S${w.sample_index + 1}`;
                    if (typeof w.point_index === 'number') {
                        if (ret) ret += ':';
                        ret += `${w.point_index + 1}`;
                    }
                    return ret || undefined;
                }),
            },
            template.dimensions
        );
    }

    private copyWells: (BucketTemplateWell | undefined | null)[] = [];

    templateBuilder = {
        updateWell: (update: Partial<BucketTemplateWell>) => {
            const wells = [...this.template.wells];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = { ...wells[idx], ...update };
            });

            this.update({
                template: {
                    ...this.bucket.template,
                    wells,
                },
            });
        },
        updateDimensions: (dimensions: PlateDimensions) => {
            this.update({
                template: {
                    ...this.bucket.template,
                    dimensions,
                    wells: resizeArray(this.bucket.template.wells, PlateUtils.size(dimensions), undefined),
                },
            });
        },
        pointIndex: () => {
            const byKind = new Map<string, number[]>();
            const { template } = this;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                const key = getBucketTemplateWellKey(template.wells[idx]);
                if (!key) return;
                arrayMapAdd(byKind, key, idx);
            });

            const wells = [...this.template.wells];
            byKind.forEach((xs) => {
                for (let i = 0; i < xs.length; i++) {
                    wells[xs[i]] = { ...wells[xs[i]], point_index: i };
                }
            });

            this.update({
                template: {
                    ...this.bucket.template,
                    wells,
                },
            });
        },
        copy: () => {
            this.copyWells = [];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                this.copyWells.push(this.template.wells[idx]);
            });
        },
        paste: () => {
            if (!this.copyWells.length) return;

            const wells = [...this.template.wells];
            let offset = 0;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = this.copyWells[offset++ % this.copyWells.length];
            });

            this.update({
                template: {
                    ...this.bucket.template,
                    wells,
                },
            });
        },
        pasteSmart: () => {
            if (!this.copyWells.length) return;

            let maxSampleIndex = -1;

            for (const w of this.template.wells) {
                if (typeof w?.sample_index === 'number') maxSampleIndex = Math.max(w.sample_index, maxSampleIndex);
            }

            const copySampleIndexMap = new Map<number, number>();
            for (const w of this.copyWells) {
                if (typeof w?.sample_index !== 'number' || copySampleIndexMap.has(w.sample_index)) continue;
                copySampleIndexMap.set(w.sample_index, maxSampleIndex + copySampleIndexMap.size + 1);
            }

            const wells = [...this.template.wells];
            let offset = 0;
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                const well = this.copyWells[offset % this.copyWells.length];
                const loopIndex = Math.floor(offset / this.copyWells.length);
                offset++;
                if (typeof well?.sample_index === 'number') {
                    wells[idx] = {
                        ...well,
                        sample_index: loopIndex * copySampleIndexMap.size + copySampleIndexMap.get(well.sample_index)!,
                    };
                } else {
                    wells[idx] = well;
                }
            });

            this.update({
                template: {
                    ...this.bucket.template,
                    wells,
                },
            });
        },
        linearizeSampleIndices: () => {
            // TODO
        },
        clear: () => {
            const wells = [...this.template.wells];
            PlateUtils.forEachSelectionIndex(this.plate.selection, (idx) => {
                wells[idx] = undefined;
            });

            this.update({
                template: {
                    ...this.bucket.template,
                    wells,
                },
            });
        },
    };

    mount(): void {
        this.subscribe(this.state.bucket.pipe(distinctUntilKeyChanged('template')), (b) => {
            this.syncPlate();
        });
    }
}

const Model = new EditBucketModel();

export function BucketsUI() {
    useReactiveModel(Model);
    return (
        <div>
            <EditBucketUI model={Model} />
        </div>
    );
}

function EditBucketUI({ model }: { model: EditBucketModel }) {
    const bucket = useBehavior(model.state.bucket);
    const sampleIndex = useRef<HTMLInputElement>(null);
    const pointIndex = useRef<HTMLInputElement>(null);

    return (
        <VStack gapY={2}>
            <Field label='Name'>
                <SmartInput
                    placeholder='Enter bucket name'
                    value={bucket.name}
                    onChange={(name) => model.update({ name })}
                    index={0}
                />
            </Field>
            <Field label='Description'>
                <SmartInput
                    placeholder='Enter optional description'
                    value={bucket.description}
                    onChange={(description) => model.update({ description })}
                    index={1}
                />
            </Field>
            <Field label='Project'>
                <SmartInput
                    placeholder='Enter optional project'
                    value={bucket.project}
                    onChange={(project) => model.update({ project })}
                    index={2}
                />
            </Field>
            <Field label='Source Labware'>
                <SmartInput
                    placeholder='Enter optional source labware'
                    value={bucket.source_labware}
                    onChange={(source_labware) => model.update({ source_labware })}
                    index={3}
                />
            </Field>
            <Field label='ARP Labware'>
                <SmartInput
                    placeholder='Enter optional ARP labware'
                    value={bucket.arp_labware}
                    onChange={(arp_labware) => model.update({ arp_labware })}
                    index={4}
                />
            </Field>
            <Field label='Sample Dilution Curve'>
                <FileUploadRoot maxFiles={5}>
                    <FileUploadTrigger asChild>
                        <Button variant='outline' size='sm'>
                            <HiUpload /> Select Curve
                        </Button>
                    </FileUploadTrigger>
                </FileUploadRoot>
            </Field>
            <Field label='Normalize Solvent'>
                <SimpleSelect
                    value={bucket.normalize_solvent}
                    onChange={(normalize_solvent) => model.update({ normalize_solvent })}
                    options={['per-curve', 'global', 'no']}
                />
            </Field>

            <Field label='Template' />
            <Flex alignItems='flex-start' w='100%' gap={4}>
                <Box width={640} height={480} position='relative'>
                    <PlateVisual model={model.plate} />
                </Box>
                <VStack gap={2} mt={4} w={300}>
                    <ControlButton model={model} kind='+' label='Control +' />
                    <ControlButton model={model} kind='-' label='Control -' />
                    <ControlButton model={model} kind='R1' label='Ref1' />
                    <ControlButton model={model} kind='R2' label='Ref2' />
                    <ControlButton model={model} kind='R3' label='Ref3' />
                    <HStack gap={2} alignItems='flex-start' w='100%'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                                model.templateBuilder.updateWell({
                                    kind: undefined,
                                    sample_index: +sampleIndex.current!.value - 1,
                                });
                                sampleIndex.current!.value = '';
                            }}
                        >
                            Sample Index
                        </Button>
                        <Input ref={sampleIndex} size='sm' placeholder='Enter smpl. index' />
                    </HStack>

                    <HStack gap={2} alignItems='flex-start' w='100%'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                                if (!pointIndex.current!.value.trim()) {
                                    model.templateBuilder.pointIndex();
                                } else {
                                    model.templateBuilder.updateWell({
                                        point_index: +pointIndex.current!.value - 1,
                                    });
                                }
                                sampleIndex.current!.value = '';
                            }}
                        >
                            Point Index
                        </Button>

                        <Input ref={pointIndex} size='sm' placeholder='Enter pt. index' />
                    </HStack>

                    <HStack gap={2} alignItems='flex-start' w='100%'>
                        <Button variant='outline' size='sm' onClick={model.templateBuilder.copy}>
                            Copy
                        </Button>
                        <Button variant='outline' size='sm' onClick={model.templateBuilder.paste}>
                            Paste Exact
                        </Button>
                        <Button variant='outline' size='sm' onClick={model.templateBuilder.pasteSmart}>
                            Paste Smart
                        </Button>
                    </HStack>
                    <Button variant='outline' size='sm' onClick={model.templateBuilder.clear} w='100%'>
                        Clear
                    </Button>
                </VStack>
            </Flex>
        </VStack>
    );
}

function ControlButton({ model, kind, label }: { model: EditBucketModel; kind: string; label: string }) {
    return (
        <HStack gap={2} w='100%'>
            <Button
                variant='outline'
                size='sm'
                onClick={() => model.templateBuilder.updateWell({ kind, sample_index: undefined })}
                w='80px'
            >
                {label}
            </Button>
            <Button variant='outline' size='sm'>
                <HiUpload /> Curve
            </Button>
            <Input placeholder='Smpl. Id' w='100px' />
        </HStack>
    );
}

//   <ul>
//             <li>
//                 Properties:{' '}
//                 <code>
//                     Name, description, template (optional for nARP only buckets), single ample curve, ability to
//                     annotate controls, each control can have a separate curve, source labware name, arp labware name
//                 </code>
//             </li>
//             <li>Intermediate volume determined by curve</li>
//             <li>Ability to clone buckets, export/import using JSON</li>
//         </ul>

//      <Box position='relative' width={640} height={480}>
//             <PlateVisual model={_Plate1} />
//         </Box>

//         <Box position='relative' width={640} height={480}>
//             <PlateVisual model={_Plate2} />
//         </Box>

// const _Plate1 = new PlateModel(PlateLayouts[24]);
// const _Plate2 = new PlateModel(PlateLayouts[384]);

// const Colors = PlateUtils.emptyColors(_Plate2.dimensions);
// const Labels = PlateUtils.emptyLabels(_Plate2.dimensions);

// PlateUtils.forEachColMajorIndex(_Plate2.dimensions, (idx) => {
//     Colors[idx] = d3c.interpolateWarm(idx / (Colors.length - 1));
//     Labels[idx] = String(idx);
// });
// _Plate2.update({ colors: Colors, labels: Labels });
