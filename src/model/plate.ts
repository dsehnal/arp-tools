export type PlateDimensions = [rows: number, cols: number];
export type PlateSelection = boolean[];
export type PlateColors = (string | undefined | null)[];
export type PlateLabels = (string | undefined | null)[];
export type WellCoords = [row: number, col: number];

export const PlateLayouts = {
    12: [3, 4] as PlateDimensions,
    24: [4, 6] as PlateDimensions,
    96: [8, 12] as PlateDimensions,
    384: [16, 24] as PlateDimensions,
    1536: [32, 48] as PlateDimensions,
};

export interface Plate<T = any> {
    dimensions: PlateDimensions;
    wells: (T | undefined | null)[]; // row-major indexing
}

export const PlateUtils = {
    empty<T>(dimensions: PlateDimensions): Plate<T> {
        return { dimensions, wells: new Array(PlateUtils.size(dimensions)).fill(null) };
    },
    size([rows, cols]: PlateDimensions) {
        return cols * rows;
    },
    rowMajorToColMajorIndex([rows, cols]: PlateDimensions, index: number) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return col * rows + row;
    },
    colMajorToRowMajorIndex([rows, cols]: PlateDimensions, index: number) {
        const col = Math.floor(index / rows);
        const row = index % rows;
        return row * cols + col;
    },
    forEachRowMajorWell<T>(
        plate: Plate<T>,
        action: (well: T | undefined | null, rowMajorIndex: number, row: number, col: number) => any
    ) {
        let index = 0;
        for (let row = 0; row < plate.dimensions[0]; row++) {
            for (let col = 0; col < plate.dimensions[1]; col++) {
                action(plate.wells[index], index, row, col);
                index++;
            }
        }
    },
    forEachColMajorWell<T>(
        plate: Plate<T>,
        action: (well: T | undefined | null, rowMajorIndex: number, row: number, col: number) => any
    ) {
        for (let col = 0; col < plate.dimensions[1]; col++) {
            for (let row = 0; row < plate.dimensions[0]; row++) {
                const index = row * plate.dimensions[1] + col;
                action(plate.wells[index], index, row, col);
            }
        }
    },
    forEachColMajorIndex(
        dimensions: PlateDimensions,
        action: (rowMajorIndex: number, row: number, col: number) => any
    ) {
        for (let col = 0; col < dimensions[1]; col++) {
            for (let row = 0; row < dimensions[0]; row++) {
                const index = row * dimensions[1] + col;
                action(index, row, col);
            }
        }
    },
    emptySelection(dimensions: PlateDimensions): PlateSelection {
        return Array(PlateUtils.size(dimensions)).fill(0);
    },
    emptyColors(dimensions: PlateDimensions): PlateColors {
        return Array(PlateUtils.size(dimensions));
    },
    emptyLabels(dimensions: PlateDimensions): PlateLabels {
        return Array(PlateUtils.size(dimensions));
    },
    isSelectionEmpty(selection: PlateSelection) {
        for (let i = 0; i < selection.length; i++) {
            if (selection[i]) return false;
        }
        return true;
    },
    selectionSize(selection: PlateSelection) {
        let size = 0;
        for (let i = 0; i < selection.length; i++) {
            if (selection[i]) size++;
        }
        return size;
    },
    firstSelectedIndex(selection: PlateSelection) {
        for (let i = 0; i < selection.length; i++) {
            if (selection[i]) return i;
        }
    },
    forEachSelectionIndex(selection: PlateSelection, action: (rowMajorIndex: number) => any) {
        for (let i = 0; i < selection.length; i++) {
            if (selection[i]) action(i);
        }
    },
    rowToLabel(row: number) {
        return _RowToLabel.get(row) ?? String(row);
    },
    labelToRow(label: string) {
        return _LabelToRow.get(label.toUpperCase()) ?? -1;
    },
    applySelectionCoords(
        [rows, cols]: PlateDimensions,
        selection: PlateSelection,
        [rowStart, colStart]: WellCoords,
        [rowEnd, colEnd]: WellCoords,
        reset = true
    ) {
        if (reset) {
            for (let i = 0; i < selection.length; i++) selection[i] = 0 as any;
        }
        let index = 0;

        let left = Math.min(colStart, colEnd);
        let right = Math.max(colStart, colEnd);
        let top = Math.min(rowStart, rowEnd);
        let bottom = Math.max(rowStart, rowEnd);

        if (left < 0 && right < 0) {
            left = 0;
            right = cols;
        }

        if (top < 0 && bottom < 0) {
            top = 0;
            bottom = rows;
        }

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (row >= top && row <= bottom && col >= left && col <= right) {
                    selection[index] = 1 as any;
                }
                index++;
            }
        }
    },
};

function rowLabel(row: number) {
    let current = row;
    const letters: string[] = [];
    while (true) {
        letters.unshift(_Letters[current % _Letters.length]);
        current = Math.floor(current / _Letters.length);
        if (!current) break;
    }
    return letters.join('');
}

const _Letters = new Array(26).fill('A').map((_, i) => String.fromCharCode(65 + i));
const _RowToLabel = new Map(new Array(96).fill(0).map((_, i) => [i, rowLabel(i)]));
const _LabelToRow = new Map(new Array(96).fill(0).map((_, i) => [rowLabel(i), i]));
