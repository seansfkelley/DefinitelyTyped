export interface PlotDatum {
    curveNumber: number;
    data: Data;
    pointIndex: number;
    pointNumber: number;
    x: Datum;
    xaxis: LayoutXAxis;
    y: Datum;
    yaxis: LayoutYAxis;
}

export interface PlotMouseEvent {
    points: PlotDatum[];
    event: MouseEvent;
}

export interface SelectionRange {
    x: number[];
    y: number[];
}

export interface PlotSelectionEvent {
    points: PlotDatum[];
    range?: SelectionRange;
    lassoPoints?: SelectionRange;
}

export type PlotRestyleEvent = [
    any, // update object -- attribute updated: new value
    number[] // array of traces updated
];

export interface PlotScene {
    center: Point;
    eye: Point;
    up: Point;
}

export interface PlotRelayoutEvent {
    "xaxis.range[0]"?: number;
    "xaxis.range[1]"?: number;
    "xaxis.autorange"?: true;
    "yaxis.range[0]"?: number;
    "yaxis.range[1]"?: number;
    "yaxis.autorange"?: true;
    scene?: PlotScene;
}

export interface ClickAnnotationEvent {
    index: number;
    annotation: Annotations;
    fullAnnotation: Annotations;
    event: MouseEvent;
}

export interface FrameAnimationEvent {
    name: string;
    frame: Frame;
    animation: {
        frame: {
            duration: number;
            redraw: boolean;
        };
        transition: Transition;
    };
}

export interface LegendClickEvent {
    event: MouseEvent;
    node: PlotlyHTMLElement;
    curveNumber: number;
    expandedIndex: number;
    data: Data[];
    layout: Layout;
    frames: Frame[];
    config: Config;
    fullData: Data[];
    fullLayout: Layout;
}

export interface SliderChangeEvent {
    slider: Slider;
    step: SliderStep;
    interaction: boolean;
    previousActive: number;
}

export interface SliderStartEvent {
    slider: Slider;
}

export interface SliderEndEvent {
    slider: Slider;
    step: SliderStep;
}

export interface BeforePlotEvent {
    data: Data[];
    layout: Layout;
    config: Config;
}

export interface PlotlyHTMLElement extends HTMLElement {
    on(
        event: "plotly_click" | "plotly_hover" | "plotly_unhover",
        callback: (event: PlotMouseEvent) => void
    ): void;
    on(
        event: "plotly_selecting" | "plotly_selected",
        callback: (event: PlotSelectionEvent) => void
    ): void;
    on(
        event: "plotly_restyle",
        callback: (data: PlotRestyleEvent) => void
    ): void;
    on(
        event: "plotly_relayout",
        callback: (event: PlotRelayoutEvent) => void
    ): void;
    on(
        event: "plotly_clickannotation",
        callback: (event: ClickAnnotationEvent) => void
    ): void;
    on(
        event: "plotly_animatingframe",
        callback: (event: FrameAnimationEvent) => void
    ): void;
    on(
        event: "plotly_legendclick" | "plotly_legenddoubleclick",
        callback: (event: LegendClickEvent) => boolean
    ): void;
    on(
        event: "plotly_sliderchange",
        callback: (event: SliderChangeEvent) => void
    ): void;
    on(
        event: "plotly_sliderend",
        callback: (event: SliderEndEvent) => void
    ): void;
    on(
        event: "plotly_sliderstart",
        callback: (event: SliderStartEvent) => void
    ): void;
    on(event: "plotly_event", callback: (data: any) => void): void;
    on(
        event: "plotly_beforeplot",
        callback: (event: BeforePlotEvent) => boolean
    ): void;
    on(
        event:
            | "plotly_afterexport"
            | "plotly_afterplot"
            | "plotly_animated"
            | "plotly_animationinterrupted"
            | "plotly_autosize"
            | "plotly_beforeexport"
            | "plotly_deselect"
            | "plotly_doubleclick"
            | "plotly_framework"
            | "plotly_redraw"
            | "plotly_transitioning"
            | "plotly_transitioninterrupted",
        callback: () => void
    ): void;
    removeAllListeners: (handler: string) => void;
}
