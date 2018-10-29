import { forEach, isString, omit, isArray, uniq, size, range, sortBy } from "lodash";
import writer from "./writer";
import { string } from "parsimmon";

interface Trace {
    meta: {
        description: string;
    };
    attributes: {
        type: string;
    } & {
        [name: string]: Attribute;
    };
}

interface Attribute {
    valType: string;
    role: string;
    description: string;
    [key: string]: any;
}

export default function generate(schema: any) {
    const write = writer();

    const attributeMetaKeys = [
        ...schema.defs.metaKeys,
        "valType",
    ];

    function writeDocComment(content: string, tags?: Record<string, string>) {
        if (content || (tags && size(tags) > 0)) {
            write("/**");
            if (content) {
                write(` * ${content}`)
            }
            forEach(tags, (value, name) => {
                if (value != null) {
                    write(` * @${name} ${JSON.stringify(value)}`);
                }
            });
            write("*/");
        }
    }

    function recursivelyWriteAttributes(data: string | Attribute, name: string) {
        if (isString(data)) {
            throw new Error(`unexpected string for "${name}"`);
        }

        function writeAttribute(type: string) {
            write(`${name}?: ${type};\n`);
        }

        writeDocComment(data.description, data.dflt == null ? {} : { 'default': data.dflt });

        if (data.role === "object") {
            write(`${name}?: {`);
            forEach(omit(data, attributeMetaKeys), recursivelyWriteAttributes);
            write("}");
        } else {
            if (data.valType === "boolean") {
                writeAttribute("boolean");
            } else if (data.valType === "integer" || data.valType === "number" || data.valType === "angle") {
                writeAttribute(data.arrayOk ? "OneOrMany<number>" : "number");
            } else if (data.valType === "enumerated") {
                if (data.values.includes("gregorian")) {
                    writeAttribute("Calendar");
                } else {
                    writeAttribute(
                        uniq(
                            (data.values as any[]).map(v => {
                                if (v === "/^x([2-9]|[1-9][0-9]+)?$/") {
                                    return "AxisName";
                                } else if (v === "/^y([2-9]|[1-9][0-9]+)?$/") {
                                    return "AxisName";
                                } else {
                                    return JSON.stringify(v);
                                }
                            })
                        )
                        .join(" | ")
                    );
                }
            } else if (data.valType === "string" || data.valType === "color") {
                const type = data.values
                    ? [
                        ...(data.values as any[]).map(v => JSON.stringify(v)),
                        "string",
                    ].join(" | ")
                    : "string";
                writeAttribute(data.arrayOk ? `OneOrMany<${type}>` : type);
            } else if (data.valType === "colorlist") {
                writeAttribute("OneOrMany<string>");
            } else if (data.valType === "colorscale") {
                writeAttribute("string | Array<[number, string]>");
            } else if (data.valType === "data_array") {
                writeAttribute("Datum[] | TypedArray");
            } else if (data.valType === "flaglist") {
                const permutations = sortBy(
                    range(1, Math.pow(2, data.flags.length - 1))
                        .map(bitmap => (data.flags as string[]).filter((_, index) => (bitmap & (1 << index)) != 0)),
                    'length');

                const type = permutations
                    .map(items => JSON.stringify(items.join("+")))
                    .concat((data.extras as string[] || []).map(item => JSON.stringify(item)))
                    .join(" | ");

                writeAttribute(data.arrayOk ? `OneOrMany<${type}>` : type);
            } else if (data.valType === "info_array") {
                // TODO: Inspect the types of the items.
                // TODO: Is this actually a tuple type?
                // TODO: Support whatever freeLength is.
                if (isArray(data.items)) {
                    // writeAttribute("[" + Array(data.items.length).map(() => "any").join(", ") + "]");
                } else {
                    writeAttribute("any[]");
                }
            } else if (data.valType === "any") {
                writeAttribute("any");
            } else {
                console.warn(`unhandled valType "${data.valType}"`);
            }
        }
    }

    // TODO: Crank up tslint rules.
    write(`
    // Generated from Plotly.js version ${"hallo"}

    /* tslint:disable:max-line-length */
    /* tslint:disable:member-ordering */

    export type OneOrMany<T> = T[] | T;

    export type Datum = string | number | Date | null;

    export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

    export type Calendar =
        | "gregorian"
        | "chinese"
        | "coptic"
        | "discworld"
        | "ethiopian"
        | "hebrew"
        | "islamic"
        | "julian"
        | "mayan"
        | "nanakshahi"
        | "nepali"
        | "persian"
        | "jalali"
        | "taiwan"
        | "thai"
        | "ummalqura";
    `);

    forEach(schema.traces, (trace: Trace, name) => {
        if (trace.meta) {
            writeDocComment(trace.meta.description);
        }
        write(`export interface ${name[0].toUpperCase() + name.slice(1)}Data {`);
        write(`type: "${trace.attributes.type}";\n`);
        forEach(omit(trace.attributes, "type", attributeMetaKeys), recursivelyWriteAttributes);
        write(`}`);
    });

    write(`
    export type AxisName =
        | 'x' | 'x2' | 'x3' | 'x4' | 'x5' | 'x6' | 'x7' | 'x8' | 'x9'
        | 'y' | 'y2' | 'y3' | 'y4' | 'y5' | 'y6' | 'y7' | 'y8' | 'y9';
    `);

    write(`export interface Layout {`);
    forEach(omit(schema.layout.layoutAttributes, attributeMetaKeys), recursivelyWriteAttributes);
    write(`}`);

    return write.format();
}
