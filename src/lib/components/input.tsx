import { roundValue } from '@/utils';
import { Input } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export interface SmartInputProps<T> {
    value: T;
    placeholder?: string;
    format?: (value: T) => string;
    parse?: (value: string) => T | null;
    onChange?: (value: T) => void;
    sm?: boolean;
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
    sm,
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
            size={sm ? 'sm' : undefined}
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
                if (parsed !== value) onChange?.(parsed);
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

const unitParsers = new Map<number, (v: string) => number | null>();

export const SmartParsers = {
    number: (value: string) => {
        if (value.trim() === '') return null;
        const parsed = +value;
        return Number.isNaN(parsed) ? null : parsed;
    },
    unit: (factor: number) => {
        if (unitParsers.has(factor)) return unitParsers.get(factor)!;
        const f = (value: string) => {
            if (value.trim() === '') return null;
            const parsed = +value;
            return Number.isNaN(parsed) ? null : factor * parsed;
        };
        unitParsers.set(factor, f);
        return f;
    },
};

const unitFormatters = new Map<string, (v: number) => string>();

export const SmartFormatters = {
    unit: (factor = 1, round = 3) => {
        const key = `${factor}-${round}`;
        if (unitFormatters.has(key)) return unitFormatters.get(key)!;
        const f = (value: number) => {
            return `${roundValue(factor * value, round)}`;
        };
        unitFormatters.set(key, f);
        return f;
    },
};
