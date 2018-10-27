/// <reference types="node" />

import axios from "axios";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { forEach, isString, omit, isArray, flatMap, range, uniq } from "lodash";
import { format } from "prettier";

// https://api.plot.ly/v2/plot-schema
type PlotlySchemaResponse = {
    sha1: string;
    modified: true;
    schema: any;
} | {
    sha1: string;
    modified: false;
};

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

// TODO: Read from file.
const sha1 = '';

function firstLetterUpper(s: string) {
    const lower = s.toLowerCase();
    return s[0].toUpperCase() + s.slice(1);
}

function generate(schema: any) {
    const attributeMetaKeys = [
        ...schema.defs.metaKeys,
        "valType",
    ];

    let fileContent = "";

    function write(content: string) {
        fileContent += content;
    }

    function writeDocComment(content: string) {
        if (content) {
            write(`
            /**
             * ${content}
             */
            `);
        }
    }

    function createAttributeWriter(prefix: string | undefined = undefined) {
        return (data: string | Attribute, name: string) => {
            const prefixedName = prefix ? `${prefix}.${name}` : name;
            const writableName = prefixedName.includes(".") ? `"${prefixedName}"` : prefixedName;

            if (isString(data)) {
                throw new Error(`unexpected string for "${prefixedName}"`);
            }

            function writeAttribute(type: string) {
                write(`${writableName}: ${type};`);
            }

            if (data.role === "object") {
                forEach(omit(data, attributeMetaKeys), createAttributeWriter(prefixedName));
            } else {
                writeDocComment(data.description);
                if (data.valType === "boolean") {
                    writeAttribute("boolean");
                } else if (data.valType === "integer" || data.valType === "number" || data.valType === "angle") {
                    writeAttribute(data.arrayOk ? "OneOrMany<number>" : "number");
                } else if (data.valType === "enumerated") {
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
                    // TODO: Generate permutations.
                    writeAttribute("string");
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
                    if (!data.valType) {
                        console.log(prefix)
                    }
                    console.warn(`unhandled valType "${data.valType}"`);
                }
            }
        };
    }

    write(`
    // Generated from Plotly.js version ${"hallo"}

    /* tslint:disable:max-line-length */
    /* tslint:disable:member-ordering */

    export type OneOrMany<T> = T[] | T;
    export type Datum = string | number | Date | null;
    export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

    `);

    forEach(schema.traces, (trace: Trace, name) => {
        if (trace.meta) {
            writeDocComment(trace.meta.description);
        }
        write(`export interface ${firstLetterUpper(name)}Data {`);
        write(`type: "${trace.attributes.type}";`);
        forEach(omit(trace.attributes, "type", attributeMetaKeys), createAttributeWriter());
        write(`}`);
    });

    write(`
    export type AxisName =
        | 'x' | 'x2' | 'x3' | 'x4' | 'x5' | 'x6' | 'x7' | 'x8' | 'x9'
        | 'y' | 'y2' | 'y3' | 'y4' | 'y5' | 'y6' | 'y7' | 'y8' | 'y9';
    `);

    write(`export interface Layout {`);
    forEach(omit(schema.layout.layoutAttributes, attributeMetaKeys), createAttributeWriter());
    write(`}`);

    return format(fileContent, {
        parser: "typescript",
    });
}

const OUTPUT_PATH = join(__dirname, "index.d.ts");

try {
    unlinkSync(OUTPUT_PATH);
} catch {}
writeFileSync(OUTPUT_PATH, generate(require(join(__dirname, "plotly.json")).schema));


// axios.get(`https://api.plot.ly/v2/plot-schema?sha1={sha1}`)
//     .then(response => {
//         writeFileSync(join(__dirname, "plotly.json"), JSON.stringify(response.data as PlotlySchemaResponse, null, 2));
//     })
