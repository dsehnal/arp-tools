import { SelectContent, SelectItem, SelectRoot, SelectTrigger, SelectValueText } from '@/components/ui/select';
import { createListCollection } from '@chakra-ui/react';
import { useMemo } from 'react';

export interface SimpleSelectProps<T extends string> {
    options: ([T, string] | T)[];
    value: T | undefined;
    onChange: (value: T) => void;
    readOnly?: boolean;
    size?: 'xs' | 'sm';
    placeholder?: string;
    allowEmpty?: boolean;
}

export function SimpleSelect<T extends string>({
    options,
    value,
    onChange,
    size,
    readOnly,
    placeholder,
    allowEmpty,
}: SimpleSelectProps<T>) {
    const col = useMemo(() => {
        return createListCollection({
            items: options.map((option) =>
                typeof option === 'string' ? { label: option, value: option } : { label: option[1], value: option[0] }
            ),
        });
    }, [options]);

    return (
        <SelectRoot
            collection={col}
            size={size}
            value={value ? [value] : []}
            onValueChange={(e) => onChange(e.value[0] as any)}
            readOnly={readOnly}
        >
            <SelectTrigger>
                <SelectValueText placeholder={placeholder ?? 'Select value...'} />
            </SelectTrigger>
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
        </SelectRoot>
    );
}
