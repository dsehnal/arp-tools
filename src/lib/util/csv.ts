import Papa from 'papaparse';

export function parseCSV<T extends string>(csv: string, fields: T[]) {
    const result = Papa.parse(csv.replace(/\t/g, ','), { header: true, delimiter: ',' });
    const fieldMap = Object.fromEntries(
        fields.map((f) => {
            const match = normalizeFieldName(f);
            const inputField = result.meta.fields?.find((g) => normalizeFieldName(g) === match);
            return [f, inputField];
        })
    ) as Record<T, string | undefined>;

    return {
        result,
        fieldMap,
        get(row: any, field: T) {
            const fieldName = this.fieldMap[field];
            if (!fieldName) return undefined;
            return row[fieldName];
        },
    };
}

function normalizeFieldName(field: string) {
    return field.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}
