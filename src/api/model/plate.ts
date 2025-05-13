export type PlateDimensions = [rows: number, cols: number];
export type PlateSelection = boolean[];
export type PlateColors = (string | undefined | null)[];
export type PlateLabels = (string | undefined | null | { header: string | undefined; main: string | undefined })[];
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
        action: (rowMajorIndex: number, row: number, col: number) => any,
        options?: { byQuadrant?: boolean }
    ) {
        if (options?.byQuadrant) {
            for (let quadrant = 0; quadrant < 4; quadrant++) {
                const ro = quadrant & 0x1;
                const co = (quadrant >> 1) & 0x1;
                for (let c = 0; c < dimensions[1] / 2; c++) {
                    const col = 2 * c + co;
                    for (let r = 0; r < dimensions[0] / 2; r++) {
                        const row = 2 * r + ro;
                        const index = row * dimensions[1] + col;
                        action(index, row, col);
                    }
                }
            }
        } else {
            for (let col = 0; col < dimensions[1]; col++) {
                for (let row = 0; row < dimensions[0]; row++) {
                    const index = row * dimensions[1] + col;
                    action(index, row, col);
                }
            }
        }
    },
    emptyWells<T>(dimensions: PlateDimensions): (T | null | undefined)[] {
        return Array(PlateUtils.size(dimensions)).fill(null);
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
    rowMajorWellIndexToLabel([, cols]: PlateDimensions, index: number) {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return PlateUtils.wellLabel(row, col);
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
    wellLabel(row: number, col: number) {
        return `${PlateUtils.rowToLabel(row)}${col + 1}`;
    },
    labelToCoords(label: string): WellCoords {
        const match = label.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return [-1, -1];
        const rowLabel = match[1];
        const colLabel = match[2];
        const row = PlateUtils.labelToRow(rowLabel);
        const col = +colLabel - 1;
        if (row < 0 || col < 0) return [-1, -1];
        return [row, col];
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
