import * as _d3 from "d3";

export as namespace Plotly;

export const d3: typeof _d3;

export interface StaticPlots {
    resize(root: Root): void;
}

export const Plots: StaticPlots;

export interface ToImageOptions {
    format: "jpeg" | "png" | "webp" | "svg";
    width: number;
    height: number;
}

export interface DownloadImageOptions {
    format: "jpeg" | "png" | "webp" | "svg";
    width: number;
    height: number;
    filename: string;
}

export type Root = string | HTMLElement;

export function newPlot(
    root: Root,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
): Promise<PlotlyHTMLElement>;
export function plot(
    root: Root,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
): Promise<PlotlyHTMLElement>;
export function relayout(
    root: Root,
    layout: Partial<Layout>
): Promise<PlotlyHTMLElement>;
export function redraw(root: Root): Promise<PlotlyHTMLElement>;
export function purge(root: Root): void;
export function restyle(
    root: Root,
    aobj: Data,
    traces?: number[] | number
): Promise<PlotlyHTMLElement>;
export function update(
    root: Root,
    traceUpdate: Data,
    layoutUpdate: Partial<Layout>,
    traces?: number[] | number
): Promise<PlotlyHTMLElement>;
export function addTraces(
    root: Root,
    traces: Data | Data[],
    newIndices?: number[] | number
): Promise<PlotlyHTMLElement>;
export function deleteTraces(
    root: Root,
    indices: number[] | number
): Promise<PlotlyHTMLElement>;
export function moveTraces(
    root: Root,
    currentIndices: number[] | number,
    newIndices?: number[] | number
): Promise<PlotlyHTMLElement>;
export function extendTraces(
    root: Root,
    update: Data | Data[],
    indices: number | number[]
): Promise<PlotlyHTMLElement>;
export function prependTraces(
    root: Root,
    update: Data | Data[],
    indices: number | number[]
): Promise<PlotlyHTMLElement>;
export function toImage(root: Root, opts: ToImageOptions): Promise<string>;
export function downloadImage(
    root: Root,
    opts: DownloadImageOptions
): Promise<string>;
export function react(
    root: Root,
    data: Data[],
    layout?: Partial<Layout>,
    config?: Partial<Config>
): Promise<PlotlyHTMLElement>;
export function addFrames(
    root: Root,
    frames: Array<Partial<Frame>>
): Promise<PlotlyHTMLElement>;
export function deleteFrames(
    root: Root,
    frames: number[]
): Promise<PlotlyHTMLElement>;

export type OneOrMany<T> = T[] | T;
export type Datum = string | number | Date | null;
export type TypedArray =
    | Int8Array
    | Uint8Array
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Uint8ClampedArray
    | Float32Array
    | Float64Array;

export interface Point {
    x: number;
    y: number;
    z: number;
}

export interface Font {
    /**
     * HTML font family - the typeface that will be applied by the web browser.
     * The web browser will only be able to apply a font if it is available on the system
     * which it operates. Provide multiple font families, separated by commas, to indicate
     * the preference in which to apply fonts if they aren't available on the system.
     * The plotly service (at https://plot.ly or on-premise) generates images on a server,
     * where only a select number of fonts are installed and supported.
     * These include *Arial*, *Balto*, *Courier New*, *Droid Sans*, *Droid Serif*,
     * *Droid Sans Mono*, *Gravitas One*, *Old Standard TT*, *Open Sans*, *Overpass*,
     * *PT Sans Narrow*, *Raleway*, *Times New Roman*.
     */
    family: string;
    size: number;
    color: string;
}

export interface SourcedFont {
    /**
     * HTML font family - the typeface that will be applied by the web browser.
     * The web browser will only be able to apply a font if it is available on the system
     * which it operates. Provide multiple font families, separated by commas, to indicate
     * the preference in which to apply fonts if they aren't available on the system.
     * The plotly service (at https://plot.ly or on-premise) generates images on a server,
     * where only a select number of fonts are installed and supported.
     * These include *Arial*, *Balto*, *Courier New*, *Droid Sans*, *Droid Serif*,
     * *Droid Sans Mono*, *Gravitas One*, *Old Standard TT*, *Open Sans*, *Overpass*,
     * *PT Sans Narrow*, *Raleway*, *Times New Roman*.
     */
    family: string;
    size: number;
    color: string;
    familysrc: string;
    sizesrc: string;
    colorsrc: string;
}

export interface Icon {
    width: number;
    path: string;
    ascent: number;
    descent: number;
}

export type ModeBarDefaultButtons =
    | "lasso2d"
    | "select2d"
    | "sendDataToCloud"
    | "autoScale2d"
    | "zoom2d"
    | "pan2d"
    | "zoomIn2d"
    | "zoomOut2d"
    | "autoScale2d"
    | "resetScale2d"
    | "hoverClosestCartesian"
    | "hoverCompareCartesian"
    | "zoom3d"
    | "pan3d"
    | "orbitRotation"
    | "tableRotation"
    | "resetCameraDefault3d"
    | "resetCameraLastSave3d"
    | "hoverClosest3d"
    | "zoomInGeo"
    | "zoomOutGeo"
    | "resetGeo"
    | "hoverClosestGeo"
    | "hoverClosestGl2d"
    | "hoverClosestPie"
    | "toggleHover"
    | "toImage"
    | "resetViews"
    | "toggleSpikelines";

export interface ModeBarButton {
    /** name / id of the buttons (for tracking) */
    name: string;

    /**
     * text that appears while hovering over the button,
     * enter null, false or '' for no hover text
     */
    title: string;

    /**
     * svg icon object associated with the button
     * can be linked to Plotly.Icons to use the default plotly icons
     */
    icon: string | Icon;

    /** icon positioning */
    gravity?: string;

    /**
     * click handler associated with the button, a function of
     * 'gd' (the main graph object) and
     * 'ev' (the event object)
     */
    click: (gd: PlotlyHTMLElement, ev: MouseEvent) => void;

    /**
     * attribute associated with button,
     * use this with 'val' to keep track of the state
     */
    attr?: string;

    /** initial 'attr' value, can be a function of gd */
    val?: any;

    /** is the button a toggle button? */
    toggle?: boolean;
}

export interface Edits {
    annotationPosition: boolean;
    annotationTail: boolean;
    annotationText: boolean;
    axisTitleText: boolean;
    colorbarPosition: boolean;
    colorbarTitleText: boolean;
    legendPosition: boolean;
    legendText: boolean;
    shapePosition: boolean;
    titleText: boolean;
}

export interface Config {
    /** no interactivity, for export or image generation */
    staticPlot: boolean;

    /** we can edit titles, move annotations, etc */
    editable: boolean;
    edits: Partial<Edits>;

    /** DO autosize once regardless of layout.autosize (use default width or height values otherwise) */
    autosizable: boolean;

    /** set the length of the undo/redo queue */
    queueLength: number;

    /** if we DO autosize, do we fill the container or the screen? */
    fillFrame: boolean;

    /** if we DO autosize, set the frame margins in percents of plot size */
    frameMargins: number;

    /** mousewheel or two-finger scroll zooms the plot */
    scrollZoom: boolean;

    /** double click interaction (false, 'reset', 'autosize' or 'reset+autosize') */
    doubleClick: "reset+autosize" | "reset" | "autosize" | false;

    /** new users see some hints about interactivity */
    showTips: boolean;

    /** enable axis pan/zoom drag handles */
    showAxisDragHandles: boolean;

    /** enable direct range entry at the pan/zoom drag points (drag handles must be enabled above) */
    showAxisRangeEntryBoxes: boolean;

    /** link to open this plot in plotly */
    showLink: boolean;

    /** if we show a link, does it contain data or just link to a plotly file? */
    sendData: boolean;

    /** text appearing in the sendData link */
    linkText: string;

    /** false or function adding source(s) to linkText <text> */
    showSources: boolean;

    /** display the mode bar (true, false, or 'hover') */
    displayModeBar: "hover" | boolean;

    /** remove mode bar button by name (see ./components/modebar/buttons.js for the list of names) */
    modeBarButtonsToRemove: ModeBarDefaultButtons[];

    /** add mode bar button using config objects (see ./components/modebar/buttons.js for list of arguments) */
    modeBarButtonsToAdd: ModeBarDefaultButtons[] | ModeBarButton[];

    /**
     * fully custom mode bar buttons as nested array, where the outer
     * arrays represents button groups, and the inner arrays have
     * buttons config objects or names of default buttons
     * (see ./components/modebar/buttons.js for more info)
     */
    modeBarButtons: ModeBarDefaultButtons[][] | ModeBarButton[][] | false;

    /** add the plotly logo on the end of the mode bar */
    displaylogo: boolean;

    /** increase the pixel ratio for Gl plot images */
    plotGlPixelRatio: number;

    /**
     * function to add the background color to a different container
     * or 'opaque' to ensure there's white behind it
     */
    setBackground: string | "opaque" | "transparent";

    /** URL to topojson files used in geo charts */
    topojsonURL: string;

    /**
     * Mapbox access token (required to plot mapbox trace types)
     * If using an Mapbox Atlas server, set this option to '',
     * so that plotly.js won't attempt to authenticate to the public Mapbox server.
     */
    mapboxAccessToken: string;

    /**
     * Turn all console logging on or off (errors will be thrown)
     * This should ONLY be set via Plotly.setPlotConfig
     */
    logging: boolean | 0 | 1 | 2;

    /** Set global transform to be applied to all traces with no specification needed */
    globalTransforms: any[];

    /** Which localization should we use? Should be a string like 'en' or 'en-US' */
    locale: string;
}
