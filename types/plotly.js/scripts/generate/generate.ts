/// <reference types="node" />

import { readFileSync } from "fs";
import { join } from "path";
import { forEach, isString, omit, isArray, uniq, size, range, sortBy, isEqual, values, map, keys } from "lodash";

import writer from "./writer";

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

const namedEnumerations: Record<string, { name: string; values?: string[]; }> = {
    "gregorian": {
        name: "Calendar",
    },
    "circle-open-dot": {
        name: "MarkerSymbol",
    }
};

const namedObjectTypes: Record<string, string[]> = {
    "Font": ["family", "size", "color"],
    "Point": ["x", "y", "z"],
}

function setEquality(a: string[], b: string[]) {
    return isEqual(sortBy(a), sortBy(b));
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
            const attributes = omit(data, attributeMetaKeys);
            const objectTypeName = keys(namedObjectTypes).find(objectType => {
                return setEquality(namedObjectTypes[objectType], keys(attributes));
            })
            if (objectTypeName != null) {
                writeAttribute(objectTypeName);
            } else {
                write(`${name}?: {`);
                forEach(attributes, recursivelyWriteAttributes);
                write("}");
            }
        } else {
            if (data.valType === "boolean") {
                writeAttribute("boolean");
            } else if (data.valType === "integer" || data.valType === "number" || data.valType === "angle") {
                writeAttribute(data.arrayOk ? "OneOrMany<number>" : "number");
            } else if (data.valType === "enumerated") {
                const values: string[] = data.values;

                const namedEnumeration = values.map(v => namedEnumerations[v]).find(e => e != null);
                if (namedEnumeration != null) {
                    const sortedValues = sortBy(values);
                    if (namedEnumeration.values == null) {
                        namedEnumeration.values = sortedValues;
                        writeAttribute(namedEnumeration.name);
                        return;
                    } else if (isEqual(namedEnumeration.values, sortedValues)) {
                        writeAttribute(namedEnumeration.name);
                        return;
                    }
                }

                writeAttribute(
                    uniq(
                        values.map(v => {
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
            } else if (data.valType === "color") {
                writeAttribute("Color");
            } else if (data.valType === "string") {
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

    function getDataTypeName(traceName: string) {
        return `${traceName[0].toUpperCase() + traceName.slice(1)}Data`;
    }

    write(readFileSync(join(__dirname, "header_d.ts")).toString("utf-8"));
    write(readFileSync(join(__dirname, "globals_d.ts")).toString("utf-8"));

    write(`export type Data = ${map(schema.traces, (_, name) => getDataTypeName(name)).join(" | ")};`);

    forEach(schema.traces, (trace: Trace, name) => {
        if (trace.meta) {
            writeDocComment(trace.meta.description);
        }
        write(`export interface ${getDataTypeName(name)} {`);
        write(`type: "${trace.attributes.type}";\n`);
        forEach(omit(trace.attributes, "type", attributeMetaKeys), recursivelyWriteAttributes);
        write(`}`);
    });

    write(`export interface Layout {`);
    forEach(omit(schema.layout.layoutAttributes, attributeMetaKeys), recursivelyWriteAttributes);
    write(`}`);

    values(namedEnumerations).map(({ name, values }) => {
        if (values != null) {
            write(`type ${name} = ${values.map(v => JSON.stringify(v)).join(" | ")};`);
            write('');
        }
    });

    write(readFileSync(join(__dirname, "events_d.ts")).toString("utf-8"));

    return write.format();
}
