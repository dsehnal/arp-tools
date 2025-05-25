import { SelectContent, SelectItem } from '@/components/ui/select';
import { createListCollection, Select } from '@chakra-ui/react';
import { useMemo } from 'react';

export interface SimpleSelectProps<T extends string | string[]> {
    options: ([string, string] | T)[];
    value: T | undefined;
    onChange: (value: T) => void;
    readOnly?: boolean;
    size?: 'xs' | 'sm';
    placeholder?: string;
    allowEmpty?: boolean;
    multiple?: boolean;
}

export function SimpleSelect<T extends string | string[]>({
    options,
    value,
    onChange,
    size,
    readOnly,
    placeholder,
    allowEmpty,
    multiple = false,
}: SimpleSelectProps<T>) {
    const col = useMemo(() => {
        return createListCollection({
            items: options.map((option) =>
                typeof option === 'string' ? { label: option, value: option } : { label: option[1], value: option[0] }
            ),
        });
    }, [options]);

    return (
        <Select.Root
            collection={col}
            size={size}
            value={value ? (Array.isArray(value) ? value : [value]) : []}
            onValueChange={(e) => onChange(multiple ? e.value : (e.value[0] as any))}
            readOnly={readOnly}
            multiple={multiple}
        >
            <Select.Trigger>
                <Select.ValueText placeholder={placeholder ?? 'Select value...'} />
            </Select.Trigger>
            <Select.IndicatorGroup />
            <SelectContent portalled={false}>
                {allowEmpty && (
                    <SelectItem item={{ label: placeholder ?? 'Select value...', value: '' }}>
                        {placeholder ?? 'Select value...'}
                    </SelectItem>
                )}
                {col.items.map((item) => (
                    <SelectItem item={item} key={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select.Root>
    );
}
