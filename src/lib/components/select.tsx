import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
} from '@/components/ui/select';
import { createListCollection } from '@chakra-ui/react';
import { useMemo } from 'react';

export interface SimpleSelectProps<T extends string> {
    options: ([T, string] | T)[];
    value: T | undefined;
    onChange: (value: T) => void;
    readOnly?: boolean;
    size?: 'sm';
    placeholder?: string;
}

export function SimpleSelect<T extends string>({
    options,
    value,
    onChange,
    size,
    readOnly,
    placeholder,
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
            <SelectContent>
                {col.items.map((item) => (
                    <SelectItem item={item} key={item.value}>
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </SelectRoot>
    );
}
