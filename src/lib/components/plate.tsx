import { PlateColors, PlateDimensions, PlateLabels, PlateSelection, PlateUtils, WellCoords } from '@/api/model/plate';
import { useEffect, useRef } from 'react';
import * as d3c from 'd3-color';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { ReactiveModel } from '../reactive-model';
import { arrayEqual, resizeArray } from '../util/array';

export interface PlateState {
    dimensions: PlateDimensions;
    labels: PlateLabels;
    colors: PlateColors;
    selection: PlateSelection;
    highlight: PlateSelection;
}

export class PlateModel extends ReactiveModel {
    state = new BehaviorSubject<PlateState>({
        dimensions: [1, 1],
        labels: [],
        colors: [],
        selection: [],
        highlight: [],
    });

    private parent: HTMLDivElement | undefined = undefined;

    metrics: ReturnType<typeof getCanvasMetrics> = { dx: 1, dy: 1 };

    get size() {
        return this.parent?.getBoundingClientRect();
    }

    get selection() {
        return this.state.value.selection;
    }

    get dimensions() {
        return this.state.value.dimensions;
    }

    layers: {
        grid: HTMLCanvasElement;
        wells: HTMLCanvasElement;
        select: HTMLCanvasElement;
        highlight: HTMLCanvasElement;
    };

    ctx: {
        grid: CanvasRenderingContext2D;
        wells: CanvasRenderingContext2D;
        select: CanvasRenderingContext2D;
        highlight: CanvasRenderingContext2D;
    };

    update(next: Partial<PlateState>) {
        const update = { ...this.state.value, ...next };
        if (next.dimensions) {
            if (!arrayEqual(this.state.value.dimensions, next.dimensions)) {
                const size = PlateUtils.size(next.dimensions);
                this.metrics = getCanvasMetrics(this, next.dimensions);
                if (!next.selection) update.selection = PlateUtils.emptySelection(next.dimensions);
                if (!next.highlight) update.highlight = PlateUtils.emptySelection(next.dimensions);
                if (!next.colors) update.colors = resizeArray(this.state.value.colors, size, undefined);
                if (!next.labels) update.labels = resizeArray(this.state.value.labels, size, undefined);
            }
        }

        this.state.next(update);
    }

    private handleResize = () => {
        const { size } = this;
        if (!size) return;

        Object.values(this.layers).forEach((canvas) => {
            canvas.width = size.width;
            canvas.height = size.height;
        });

        this.metrics = getCanvasMetrics(this);
        drawPlateGrid(this);
        drawPlateWells(this);
        drawPlateSelection(this, this.layers.select, this.state.value.selection, DefaultPlateColors.select);
        drawPlateSelection(this, this.layers.highlight, this.state.value.highlight, DefaultPlateColors.highlight);
    };

    private mouseMoveCoords: WellCoords = [0, 0];
    private isMouseInside = false;
    private isMouseDown = false;
    private mouseDownCoords: WellCoords = [0, 0];
    private prevSelection: PlateSelection | undefined = undefined;

    private handleMouseMove(ev: MouseEvent) {
        if (this.isMouseDown || this.isMouseInside) {
            ev.preventDefault();
        }

        if (!this.isMouseInside && !this.isMouseDown) return;

        this.getWellCoords(ev, this.mouseMoveCoords);

        const selection = PlateUtils.emptySelection(this.dimensions);
        PlateUtils.applySelectionCoords(
            this.dimensions,
            selection,
            this.isMouseDown ? this.mouseDownCoords : this.mouseMoveCoords,
            this.mouseMoveCoords
        );
        this.update({ highlight: selection });
    }

    private handleMouseDown(ev: MouseEvent) {
        this.prevSelection = this.state.value.selection;
        this.update({ selection: PlateUtils.emptySelection(this.dimensions) });
        this.getWellCoords(ev, this.mouseDownCoords);
        this.isMouseDown = true;

        const sel = PlateUtils.emptySelection(this.dimensions);
        PlateUtils.applySelectionCoords(this.dimensions, sel, this.mouseDownCoords, this.mouseMoveCoords);
        this.update({ highlight: sel });
    }

    private handleMouseUp() {
        if (this.isMouseDown) {
            const highlight = this.state.value.highlight;
            const toggleSelection =
                this.prevSelection &&
                PlateUtils.selectionSize(highlight) === 1 &&
                arrayEqual(this.prevSelection, this.state.value.highlight);

            if (!toggleSelection) {
                this.update({ selection: highlight });
            }
            this.update({ highlight: PlateUtils.emptySelection(this.dimensions) });
        }
        this.isMouseDown = false;
    }

    private getWellCoords(ev: MouseEvent, coords: WellCoords) {
        const { size } = this;
        if (!size) {
            return;
        }

        const x = ev.clientX - size.left - PlateVisualConstants.leftOffset;
        const y = ev.clientY - size.top - PlateVisualConstants.topOffset;

        coords[0] = Math.floor(y / this.metrics.dy);
        coords[1] = Math.floor(x / this.metrics.dx);
    }

    mount(parent: HTMLDivElement) {
        this.parent = parent;

        parent.appendChild(this.layers.wells);
        parent.appendChild(this.layers.select);
        parent.appendChild(this.layers.highlight);
        parent.appendChild(this.layers.grid);

        const resizeObserver = new ResizeObserver(this.handleResize);
        resizeObserver.observe(parent);
        this.customDispose(() => resizeObserver.unobserve(parent));

        this.event(window, 'mousemove', (ev) => this.handleMouseMove(ev));
        this.event(parent, 'mousedown', (ev) => this.handleMouseDown(ev));
        this.event(window, 'mouseup', () => this.handleMouseUp());
        this.event(parent, 'mouseenter', () => {
            this.isMouseInside = true;
        });
        this.event(parent, 'mouseout', () => {
            this.isMouseInside = false;
            if (!this.isMouseDown) {
                this.update({ highlight: PlateUtils.emptySelection(this.dimensions) });
            }
        });

        this.handleResize();

        this.subscribe(this.state.pipe(distinctUntilChanged((a, b) => arrayEqual(a.dimensions, b.dimensions))), () => {
            drawPlateGrid(this);
        });
        this.subscribe(this.state.pipe(distinctUntilChanged((a, b) => arrayEqual(a.highlight, b.highlight))), () => {
            drawPlateSelection(this, this.layers.highlight, this.state.value.highlight, DefaultPlateColors.highlight);
        });
        this.subscribe(this.state.pipe(distinctUntilChanged((a, b) => arrayEqual(a.selection, b.selection))), () => {
            drawPlateSelection(this, this.layers.select, this.state.value.selection, DefaultPlateColors.select);
        });
        this.subscribe(
            this.state.pipe(distinctUntilChanged((a, b) => a.colors === b.colors && a.labels === b.labels)),
            () => {
                drawPlateWells(this);
            }
        );
    }

    dispose() {
        super.dispose();
        Object.values(this.layers).forEach((canvas) => this.parent?.removeChild(canvas));
        this.parent = undefined;
    }

    constructor(dimensions: PlateDimensions) {
        super();

        this.layers = {
            grid: createCanvas(),
            wells: createCanvas(),
            select: createCanvas(),
            highlight: createCanvas(),
        };

        this.ctx = {
            grid: this.layers.grid.getContext('2d')!,
            wells: this.layers.wells.getContext('2d')!,
            select: this.layers.select.getContext('2d')!,
            highlight: this.layers.highlight.getContext('2d')!,
        };

        this.update({
            dimensions,
            colors: PlateUtils.emptyColors(dimensions),
            labels: PlateUtils.emptyLabels(dimensions),
            selection: PlateUtils.emptySelection(dimensions),
            highlight: PlateUtils.emptySelection(dimensions),
        });
    }
}

const DefaultPlateColors = {
    highlight: 'rgba(163, 207, 255, 0.66)',
    select: 'rgba(23, 61, 166, 0.66)',
};

const PlateVisualConstants = {
    leftOffset: 24,
    topOffset: 24,
    maxLabelSize: 12,
};

function createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0px';
    canvas.style.right = '0px';
    canvas.style.top = '0px';
    canvas.style.bottom = '0px';
    canvas.style.pointerEvents = 'none';
    return canvas;
}

function getCanvasMetrics(plate: PlateModel, nextDimensions?: PlateDimensions) {
    const { size, dimensions } = plate;
    if (!size) return { dx: 0, dy: 0 };

    const [rows, cols] = nextDimensions ?? dimensions;
    const dx = (size.width - PlateVisualConstants.leftOffset - 2) / cols;
    const dy = (size.height - PlateVisualConstants.topOffset - 2) / rows;

    return { dx, dy };
}

function drawPlateGrid(plate: PlateModel) {
    const {
        size,
        dimensions: [rows, cols],
        metrics: { dx, dy },
    } = plate;
    if (!size) return;
    const ctx = plate.ctx.grid;
    ctx.clearRect(0, 0, size.width, size.height);

    ctx.setLineDash([2, 2]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(99, 99, 99, 0.33)';

    ctx.beginPath();
    for (let row = 1; row < rows; row++) {
        const offset = PlateVisualConstants.topOffset + 0.5 + row * dy;
        ctx.moveTo(PlateVisualConstants.leftOffset, offset);
        ctx.lineTo(size.width, offset);
    }

    for (let col = 1; col < cols; col++) {
        const offset = PlateVisualConstants.leftOffset + 0.5 + col * dx;
        ctx.moveTo(offset, PlateVisualConstants.topOffset);
        ctx.lineTo(offset, size.height);
    }
    ctx.stroke();
    ctx.closePath();

    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(155, 155, 155, 1.0)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        PlateVisualConstants.leftOffset,
        PlateVisualConstants.topOffset,
        size.width - PlateVisualConstants.leftOffset - 1,
        size.height - PlateVisualConstants.topOffset - 1
    );

    const labelSize = Math.min(PlateVisualConstants.maxLabelSize, (3 * dx) / 5);
    ctx.font = `${labelSize}px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#999';

    for (let row = 0; row < rows; row++) {
        ctx.fillText(
            PlateUtils.rowToLabel(row),
            PlateVisualConstants.leftOffset - 8,
            PlateVisualConstants.topOffset + 1 + row * dy + dy / 2
        );
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let col = 0; col < cols; col++) {
        ctx.fillText(
            `${col + 1}`,
            PlateVisualConstants.leftOffset + 1 + col * dx + dx / 2,
            PlateVisualConstants.topOffset - 6
        );
    }
}

function drawPlateSelection(plate: PlateModel, target: HTMLCanvasElement, selection: PlateSelection, color: string) {
    const {
        size,
        dimensions: [rows, cols],
        metrics: { dx, dy },
    } = plate;
    if (!size) return;

    const ctx = target.getContext('2d')!;
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = color;

    let index = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const sel = selection[index++];
            if (!sel) continue;

            ctx.fillRect(
                PlateVisualConstants.leftOffset + 0.5 + col * dx,
                PlateVisualConstants.topOffset + 0.5 + row * dy,
                dx,
                dy
            );
        }
    }
}

function drawPlateWells(plate: PlateModel) {
    const {
        size,
        dimensions: [rows, cols],
        metrics: { dx, dy },
    } = plate;
    if (!size) return;

    const ctx = plate.layers.wells.getContext('2d')!;
    const colors = plate.state.value.colors;
    const labels = plate.state.value.labels;

    ctx.clearRect(0, 0, size.width, size.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const defaultFont = `${PlateVisualConstants.maxLabelSize}px monospace`;
    const headerFont = `${Math.min((1 / 3) * dy - 2, PlateVisualConstants.maxLabelSize)}px monospace`;
    const mainFont = `${Math.min((2 / 3) * dy - 2, PlateVisualConstants.maxLabelSize)}px monospace`;

    let index = 0;
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const color = colors[index];
            const label = labels[index];
            index++;
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    PlateVisualConstants.leftOffset + col * dx,
                    PlateVisualConstants.topOffset + row * dy,
                    dx + 0.5,
                    dy + 0.5
                );
            }

            if (label) {
                ctx.fillStyle = labelColor(color ?? 'black');
            }

            const header = typeof label === 'string' ? undefined : label?.header;
            const main = typeof label === 'string' ? label : label?.main;

            if (header && main) {
                const x = PlateVisualConstants.leftOffset + col * dx + dx / 2;

                ctx.font = headerFont;
                let y = PlateVisualConstants.topOffset + row * dy + dy / 6 + 2;
                drawText(ctx, header, x, y, dx);

                ctx.font = mainFont;
                y = PlateVisualConstants.topOffset + row * dy + (2 * dy) / 3;
                drawText(ctx, main, x, y, dx);
            } else if (header || main) {
                ctx.font = defaultFont;
                const x = PlateVisualConstants.leftOffset + col * dx + dx / 2;
                const y = PlateVisualConstants.topOffset + row * dy + dy / 2;
                drawText(ctx, (header || main)!, x, y, dx);
            }
        }
    }
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
    const dims = ctx.measureText(text);
    const scale = Math.min(1, (0.8 * maxWidth) / dims.width);
    const f = 1 / scale;

    ctx.scale(scale, scale);
    ctx.fillText(text, f * x, f * y);
    ctx.scale(f, f);

    return dims;
}

const labelColorCache = new Map<string, string>();
function labelColor(color: string) {
    let ret = labelColorCache.get(color);
    if (!ret) {
        const hsl = d3c.hsl(color);
        ret = hsl.l >= 0.5 ? 'black' : 'white';
        labelColorCache.set(color, ret);
    }
    return ret;
}

export function PlateVisual({ model }: { model: PlateModel }) {
    const parent = useRef<HTMLDivElement>(null);
    useEffect(() => {
        model.mount(parent.current!);
        return () => model.dispose();
    }, [model]);

    return <div ref={parent} style={{ position: 'absolute', width: '100%', height: '100%', inset: 0 }} />;
}
