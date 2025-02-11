import { Input } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export interface SmartInputProps<T> {
    value: T;
    placeholder?: string;
    format?: (value: T) => string;
    parse?: (value: string) => T | null;
    onChange?: (value: T) => void;
    size?: 'sm';
    readOnly?: boolean;
    indexGroup?: string;
    index?: number;
}

export function SmartInput<T>({
    value,
    placeholder,
    format,
    parse,
    onChange,
    size,
    readOnly,
    index,
    indexGroup,
}: SmartInputProps<T>) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        ref.current!.value = format ? format(value) : String(value);
    }, [value]);

    return (
        <Input
            ref={ref}
            size={size}
            readOnly={readOnly}
            placeholder={placeholder}
            data-index={`${indexGroup ?? ''}-${index}`}
            onBlur={() => {
                const parsed = parse ? parse(ref.current!.value) : (ref.current!.value as unknown as T);
                if (parsed === null) {
                    ref.current!.value = format ? format(value) : String(value);
                    return;
                }
                ref.current!.value = format ? format(parsed) : String(parsed);
                onChange?.(parsed);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    ref.current!.blur();
                    if (typeof index === 'number') {
                        const next = document.querySelector(`input[data-index="${indexGroup ?? ''}-${index}"]`);
                        if (next) {
                            (next as HTMLElement).focus();
                        }
                    }
                }
            }}
        />
    );
}

export const SmartParsers = {
    number: (value: string) => {
        if (value.trim() === '') return null;
        const parsed = +value;
        return Number.isNaN(parsed) ? null : parsed;
    },
};
