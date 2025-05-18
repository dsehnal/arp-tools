import { BucketData } from '@/lib/tools/model/bucket';

export const TestTemplate: BucketData = {
    kind: 'bucket',
    version: 1,
    data: {
        name: 'Test Bucket',
        description: '',
        project: '',
        source_labware: {
            name: '',
            shorthand: '',
            dimensions: [16, 24],
            dead_volume_l: 0.0000025,
            well_volume_l: 0.00001,
        },
        intermediate_labware: {
            name: '',
            shorthand: '',
            dimensions: [16, 24],
            dead_volume_l: 0.0000025,
            well_volume_l: 0.00001,
        },
        arp_labware: {
            name: '',
            shorthand: '',
            dimensions: [16, 24],
            dead_volume_l: 0.0000025,
            well_volume_l: 0.00001,
        },
        normalize_solvent: 'global',
        sample_info: [
            {
                kind: 'cmpd',
                curve: {
                    options: {
                        source_concentration_m: 0.01,
                        intermediate_volume_l: 0.00001,
                        assay_volume_l: 0.00006,
                        max_intermadiate_plates: 2,
                        max_intermediate_points_per_plate: 2,
                        top_concentration_m: 0.00001,
                        n_points: 9,
                        dilution_factor: 3.1622776601683795,
                        tolerance: 0.1,
                        adjust_intermediate_volume: true,
                        min_transfer_volume_l: 2.5e-9,
                        max_transfer_volume_l: 6e-8,
                        max_intermediate_transfer_volume_l: 0.000001,
                        droplet_size_l: 2.5e-9,
                        num_intermediate_point_samples: 20,
                    },
                    nARP_concentration_M: 0.01,
                    intermediate_points: [
                        [
                            {
                                target_concentration_m: 0.0009090909,
                                actual_concentration_m: 0.0009090909,
                                transfers: [
                                    {
                                        concentration_m: 0.01,
                                        volume_l: 0.000001,
                                    },
                                ],
                            },
                            {
                                target_concentration_m: 0.0007663897,
                                actual_concentration_m: 0.0007663897,
                                transfers: [
                                    {
                                        concentration_m: 0.01,
                                        volume_l: 8.3e-7,
                                    },
                                ],
                            },
                        ],
                        [
                            {
                                target_concentration_m: 0.0000685075,
                                actual_concentration_m: 0.0000685075,
                                transfers: [
                                    {
                                        concentration_m: 0.0009090909,
                                        volume_l: 8.15e-7,
                                    },
                                ],
                            },
                            {
                                target_concentration_m: 0.0000243309,
                                actual_concentration_m: 0.0000243309,
                                transfers: [
                                    {
                                        concentration_m: 0.0009090909,
                                        volume_l: 2.7499999999999996e-7,
                                    },
                                ],
                            },
                        ],
                    ],
                    points: [
                        {
                            target_concentration_m: 0.00001,
                            actual_concentration_m: 0.00000999,
                            transfers: [
                                {
                                    concentration_m: 0.01,
                                    volume_l: 6e-8,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 0.000003162,
                            actual_concentration_m: 0.0000033322,
                            transfers: [
                                {
                                    concentration_m: 0.01,
                                    volume_l: 2e-8,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 0.000001,
                            actual_concentration_m: 9.846e-7,
                            transfers: [
                                {
                                    concentration_m: 0.01,
                                    volume_l: 5e-9,
                                },
                                {
                                    concentration_m: 0.0009090909,
                                    volume_l: 1e-8,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 3.16e-7,
                            actual_concentration_m: 3.029e-7,
                            transfers: [
                                {
                                    concentration_m: 0.0009090909,
                                    volume_l: 2e-8,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 1e-7,
                            actual_concentration_m: 9.58e-8,
                            transfers: [
                                {
                                    concentration_m: 0.0007663897,
                                    volume_l: 7.500000000000001e-9,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 3.2e-8,
                            actual_concentration_m: 3.19e-8,
                            transfers: [
                                {
                                    concentration_m: 0.0007663897,
                                    volume_l: 2.5e-9,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 1e-8,
                            actual_concentration_m: 1.01e-8,
                            transfers: [
                                {
                                    concentration_m: 0.0000243309,
                                    volume_l: 2.5e-8,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 3e-9,
                            actual_concentration_m: 2.9e-9,
                            transfers: [
                                {
                                    concentration_m: 0.0000685075,
                                    volume_l: 2.5e-9,
                                },
                            ],
                        },
                        {
                            target_concentration_m: 1e-9,
                            actual_concentration_m: 1e-9,
                            transfers: [
                                {
                                    concentration_m: 0.0000243309,
                                    volume_l: 2.5e-9,
                                },
                            ],
                        },
                    ],
                    name: 'Unnamed Curve',
                    id: '311dc6a0-7e6f-418b-ac07-109cd30c8b78',
                    created_on: '2025-02-16T11:46:37.807Z',
                    modified_on: '2025-02-16T11:54:05.771Z',
                },
            },
            {
                kind: 'ctrl+',
                is_control: true,
            },
            {
                kind: 'ctrl-',
                is_control: true,
            },
            {
                kind: 'ref',
                is_control: true,
            },
        ],
        template: [
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 0,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 1,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 2,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 3,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 4,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 5,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 6,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 7,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 8,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 9,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 10,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 11,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 0,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 1,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 2,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 3,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 4,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 5,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 6,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 7,
            },
            {
                kind: 'cmpd',
                sample_index: 12,
                point_index: 8,
            },
            {
                kind: 'ref',
                point_index: 0,
            },
            null,
            null,
            null,
            null,
            {
                kind: 'ctrl+',
                point_index: 0,
            },
            {
                kind: 'ctrl+',
                point_index: 1,
            },
            {
                kind: 'ctrl+',
                point_index: 2,
            },
            {
                kind: 'ctrl+',
                point_index: 3,
            },
            {
                kind: 'ctrl+',
                point_index: 4,
            },
            {
                kind: 'ctrl+',
                point_index: 5,
            },
            {
                kind: 'ctrl+',
                point_index: 6,
            },
            {
                kind: 'ctrl+',
                point_index: 7,
            },
            {
                kind: 'ctrl+',
                point_index: 8,
            },
            null,
            {
                kind: 'ctrl-',
                point_index: 0,
            },
            {
                kind: 'ctrl-',
                point_index: 1,
            },
            {
                kind: 'ctrl-',
                point_index: 2,
            },
            {
                kind: 'ctrl-',
                point_index: 3,
            },
            {
                kind: 'ctrl-',
                point_index: 4,
            },
            {
                kind: 'ctrl-',
                point_index: 5,
            },
            {
                kind: 'ctrl-',
                point_index: 6,
            },
            {
                kind: 'ctrl-',
                point_index: 7,
            },
            {
                kind: 'ctrl-',
                point_index: 8,
            },
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ],
        curve: {
            options: {
                source_concentration_m: 0.01,
                intermediate_volume_l: 0.00001,
                assay_volume_l: 0.00006,
                max_intermadiate_plates: 2,
                max_intermediate_points_per_plate: 2,
                top_concentration_m: 0.00001,
                n_points: 9,
                dilution_factor: 3.1622776601683795,
                tolerance: 0.1,
                adjust_intermediate_volume: true,
                min_transfer_volume_l: 2.5e-9,
                max_transfer_volume_l: 6e-8,
                max_intermediate_transfer_volume_l: 0.000001,
                droplet_size_l: 2.5e-9,
                num_intermediate_point_samples: 20,
            },
            nARP_concentration_M: 0.01,
            intermediate_points: [
                [
                    {
                        target_concentration_m: 0.0009090909,
                        actual_concentration_m: 0.0009090909,
                        transfers: [
                            {
                                concentration_m: 0.01,
                                volume_l: 0.000001,
                            },
                        ],
                    },
                    {
                        target_concentration_m: 0.0007663897,
                        actual_concentration_m: 0.0007663897,
                        transfers: [
                            {
                                concentration_m: 0.01,
                                volume_l: 8.3e-7,
                            },
                        ],
                    },
                ],
                [
                    {
                        target_concentration_m: 0.0000685075,
                        actual_concentration_m: 0.0000685075,
                        transfers: [
                            {
                                concentration_m: 0.0009090909,
                                volume_l: 8.15e-7,
                            },
                        ],
                    },
                    {
                        target_concentration_m: 0.0000243309,
                        actual_concentration_m: 0.0000243309,
                        transfers: [
                            {
                                concentration_m: 0.0009090909,
                                volume_l: 2.7499999999999996e-7,
                            },
                        ],
                    },
                ],
            ],
            points: [
                {
                    target_concentration_m: 0.00001,
                    actual_concentration_m: 0.00000999,
                    transfers: [
                        {
                            concentration_m: 0.01,
                            volume_l: 6e-8,
                        },
                    ],
                },
                {
                    target_concentration_m: 0.000003162,
                    actual_concentration_m: 0.0000033322,
                    transfers: [
                        {
                            concentration_m: 0.01,
                            volume_l: 2e-8,
                        },
                    ],
                },
                {
                    target_concentration_m: 0.000001,
                    actual_concentration_m: 9.846e-7,
                    transfers: [
                        {
                            concentration_m: 0.01,
                            volume_l: 5e-9,
                        },
                        {
                            concentration_m: 0.0009090909,
                            volume_l: 1e-8,
                        },
                    ],
                },
                {
                    target_concentration_m: 3.16e-7,
                    actual_concentration_m: 3.029e-7,
                    transfers: [
                        {
                            concentration_m: 0.0009090909,
                            volume_l: 2e-8,
                        },
                    ],
                },
                {
                    target_concentration_m: 1e-7,
                    actual_concentration_m: 9.58e-8,
                    transfers: [
                        {
                            concentration_m: 0.0007663897,
                            volume_l: 7.500000000000001e-9,
                        },
                    ],
                },
                {
                    target_concentration_m: 3.2e-8,
                    actual_concentration_m: 3.19e-8,
                    transfers: [
                        {
                            concentration_m: 0.0007663897,
                            volume_l: 2.5e-9,
                        },
                    ],
                },
                {
                    target_concentration_m: 1e-8,
                    actual_concentration_m: 1.01e-8,
                    transfers: [
                        {
                            concentration_m: 0.0000243309,
                            volume_l: 2.5e-8,
                        },
                    ],
                },
                {
                    target_concentration_m: 3e-9,
                    actual_concentration_m: 2.9e-9,
                    transfers: [
                        {
                            concentration_m: 0.0000685075,
                            volume_l: 2.5e-9,
                        },
                    ],
                },
                {
                    target_concentration_m: 1e-9,
                    actual_concentration_m: 1e-9,
                    transfers: [
                        {
                            concentration_m: 0.0000243309,
                            volume_l: 2.5e-9,
                        },
                    ],
                },
            ],
            name: 'Unnamed Curve',
            id: '311dc6a0-7e6f-418b-ac07-109cd30c8b78',
            created_on: '2025-02-16T11:46:37.807Z',
            modified_on: '2025-02-16T11:54:05.771Z',
        },
    },
};
