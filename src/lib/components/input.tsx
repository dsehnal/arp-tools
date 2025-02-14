import { roundValue } from '@/utils';
import { Input } from '@chakra-ui/react';
import { useEffect, useRef } from 'react';

export interface SmartInputProps<T> {
    value: T;
    placeholder?: string;
    format?: (value: T) => string;
    parse?: (value: string) => T | null;
    onChange?: (value: T) => void;
    size?: 'xs' | 'sm';
    readOnly?: boolean;
    indexGroup?: string;
    index?: number;
    autoFocus?: boolean;
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
    autoFocus,
}: SmartInputProps<T>) {
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        ref.current!.value = applyFormat(value, format);
    }, [value]);

    return (
        <Input
            ref={ref}
            size={size}
            readOnly={readOnly}
            placeholder={placeholder}
            data-index={`${indexGroup ?? ''}-${index}`}
            autoFocus={autoFocus}
            onBlur={() => {
                const parsed = parse ? parse(ref.current!.value) : (ref.current!.value as unknown as T);
                if (parsed === null) {
                    ref.current!.value = applyFormat(value, format);
                    return;
                }
                ref.current!.value = applyFormat(parsed, format);
                if (parsed !== value) onChange?.(parsed);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    ref.current!.blur();
                    if (typeof index === 'number') {
                        const next = document.querySelector(`input[data-index="${indexGroup ?? ''}-${index + 1}"]`);
                        if (next) {
                            (next as HTMLElement).focus();
                        }
                    }
                } else if (e.key === 'Escape') {
                    ref.current!.value = applyFormat(value, format);
                    ref.current!.blur();
                }
            }}
        />
    );
}

const unitParsers = new Map<number, (v: string) => number | null>();

function applyFormat(value: any, format?: (value: any) => string) {
    if (format) return format(value);
    if (value === null || value === undefined) return '';
    return String(value);
}

export const SmartParsers = {
    trim: (value: string) => value.trim(),
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
