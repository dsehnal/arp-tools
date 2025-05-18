import { Bucket, readBucket } from '@/lib/tools/model/bucket';
import { TestTemplate } from './test';

const _BucketPresets = [
    {
        name: 'Test Template',
        template: TestTemplate,
        description: 'A test template for testing purposes',
    },
];

export const BucketPresets = {
    options: _BucketPresets.map((t) => [t.name, t.name] as [string, string]),
    getDescription: (name: string) => {
        const preset = _BucketPresets.find((t) => t.name === name);
        return preset?.description ?? '';
    },
    getPreset: (name: string) => {
        const preset = _BucketPresets.find((t) => t.name === name);
        if (!preset) throw new Error(`Template ${name} not found`);
        const templ: Partial<Bucket> = readBucket(preset.template);
        delete templ.name;
        delete templ.description;
        delete templ.project;
        return templ as Omit<Bucket, 'name' | 'description' | 'project'>;
    },
};
