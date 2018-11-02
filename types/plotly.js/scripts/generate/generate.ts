/// <reference types="node" />

import { readFileSync } from "fs";
import { join } from "path";
import {
    forEach,
    isString,
    omit,
    isArray,
    uniq,
    size,
    range,
    sortBy,
    isEqual,
    values,
    map,
    keys,
    difference
} from "lodash";

import writer from "./writer";

interface AttributedObject {
    meta?: {
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

// If a type has exactly these fields, no more and no less, we substitute the pre-defined named
// type. Types named here should already exist in one of the literal files, like globals_d.ts.
// Note that the generator does not inspect the types of the attributes mentioned here; presence
// of this exact set of fields is considered sufficient evidence that it's the type in question.
const NAMED_OBJECT_TYPES: Record<string, string[]> = {
    Font: ["family", "size", "color"],
    SourcedFont: [
        "family",
        "size",
        "color",
        "familysrc",
        "sizesrc",
        "colorsrc"
    ],
    Point: ["x", "y", "z"]
};

// This is analogous to NAMED_OBJECT_TYPES above, except it's used to inspect the set of legal values
// for a flag-list type rather than the fields on an object type.
const NAMED_FLAG_LISTS: Record<string, string[]> = {
    ThreeDHoverInfo: ["x", "y", "z", "text", "name"],
    ConeHoverInfo: ["x", "y", "z", "u", "v", "w", "norm", "text", "name"],
    StreamtubeHoverInfo: [
        "x",
        "y",
        "z",
        "u",
        "v",
        "w",
        "norm",
        "divergence",
        "text",
        "name"
    ],
    PolarHoverInfo: ["r", "theta", "text", "name"]
};

// Unlike NAMED_OBJECT_TYPES and NAMED_FLAG_LISTS, these enumeration types are not fully specified here.
// Instead, the key is an unambiguous "representative"; the first enumeration type encountered with a given
// representative is considered the One True Declaration for that enumeration. Any subsequent enumerations
// that have the representative will refer to the named type rather than an anonymous string literal union
// if and only if they have the same set of members as the first encountered type.
//
// This is a bit roundabout, but it makes the generator robust to the enumearations changing values
// without having to update a literal in the generator. This seems likely for e.g. MarkerSymbol.
const namedEnumerations: Record<string, { name: string; values?: string[] }> = {
    gregorian: {
        name: "Calendar"
    },
    "circle-open-dot": {
        name: "MarkerSymbol"
    }
};

// TODO: This, for layouts and such.
const EXPLICIT_AXIS_COUNT = 9;

function isEqualUnordered(a: string[], b: string[]) {
    return isEqual(sortBy(a), sortBy(b));
}

function generateFlagListType(flags: string[], extras?: string[]) {
    const permutations = sortBy(
        range(1, Math.pow(2, flags.length)).map(bitmap =>
            flags.filter((_, index) => (bitmap & (1 << index)) != 0)
        ),
        "length"
    );

    return permutations
        .map(items => items.join("+"))
        .concat(extras || [])
        .map(item => JSON.stringify(item))
        .join(" | ");
}

// TODO: Use this in more places.
function generateLiteralUnionType(members: (boolean | string | number)[]) {
    return members.map(m => JSON.stringify(m)).join(" | ");
}

function getAttributeType(attribute: Attribute): string | undefined {
    if (attribute.valType === "boolean") {
        return "boolean";
    } else if (
        attribute.valType === "integer" ||
        attribute.valType === "number" ||
        attribute.valType === "angle"
    ) {
        return "number";
    } else if (attribute.valType === "color") {
        return "string";
    } else if (attribute.valType === "colorlist") {
        return "string[]";
    } else if (attribute.valType === "colorscale") {
        return "string | Array<[number, string]>";
    } else if (attribute.valType === "data_array") {
        return "Datum[] | TypedArray";
    } else if (attribute.valType === "string") {
        return attribute.values
            ? [
                  ...(attribute.values as string[]).map(v => JSON.stringify(v)),
                  "string"
              ].join(" | ")
            : "string";
    } else if (attribute.valType === "enumerated") {
        const values: string[] = attribute.values;

        const namedEnumeration = values
            .map(v => namedEnumerations[v])
            .find(e => e != null);
        if (namedEnumeration != null) {
            if (namedEnumeration.values == null) {
                namedEnumeration.values = values;
                return namedEnumeration.name;
            } else if (isEqualUnordered(namedEnumeration.values, values)) {
                return namedEnumeration.name;
            }
        }

        // Special-case AxisName because it appears in several positions with slightly different
        // "other" options, and so it's a pain to define named enumerations like other enumerations.
        return uniq(
            values.map(v => {
                if (v === "/^x([2-9]|[1-9][0-9]+)?$/") {
                    return "AxisName";
                } else if (v === "/^y([2-9]|[1-9][0-9]+)?$/") {
                    return "AxisName";
                } else {
                    return JSON.stringify(v);
                }
            })
        ).join(" | ");
    } else if (attribute.valType === "flaglist") {
        // At least one flaglist has duplicate values. :/
        const flags = uniq(attribute.flags as string[]);

        const namedFlagList = keys(NAMED_FLAG_LISTS).find(name =>
            isEqualUnordered(NAMED_FLAG_LISTS[name], flags)
        );

        return namedFlagList == null
            ? generateFlagListType(flags, attribute.extras)
            : [
                  namedFlagList,
                  ...((attribute.extras as string[]) || []).map(e =>
                      JSON.stringify(e)
                  )
              ].join(" | ");
    } else if (attribute.valType === "info_array") {
        // TODO: Inspect the types of the items.
        // TODO: Is this actually a tuple type?
        // TODO: Support whatever freeLength is.
        if (isArray(attribute.items)) {
            // return "[" + Array(data.items.length).map(() => "any").join(", ") + "]";
        } else {
            return "any[]";
        }
    } else if (attribute.valType === "any") {
        return "any";
    } else {
        return undefined;
    }
}

export default function generate(schema: any) {
    const write = writer();

    const attributeMetaKeys = [...schema.defs.metaKeys, "valType"];

    function writeDocComment(content: string, tags?: Record<string, string>) {
        if (content || (tags && size(tags) > 0)) {
            write("/**");
            if (content) {
                write(` * ${content}`);
            }
            forEach(tags, (value, name) => {
                if (value != null) {
                    write(` * @${name} ${JSON.stringify(value)}`);
                }
            });
            write("*/");
        }
    }

    function recursivelyWriteObjectType(
        data: object,
        ...omitKeys: (string | string[])[]
    ) {
        forEach(
            omit(data, attributeMetaKeys, ...omitKeys),
            recursivelyWriteAttributes
        );
    }

    function recursivelyWriteAttributes(
        data: string | Attribute,
        name: string
    ) {
        if (isString(data)) {
            throw new Error(`unexpected string for "${name}"`);
        }

        function writeAttribute(type: string) {
            write(`${name}?: ${type};\n`);
        }

        writeDocComment(
            data.description,
            data.dflt == null ? {} : { default: data.dflt }
        );

        if (data.role === "object") {
            if (name === "transforms") {
                writeAttribute("Transform[]");
            } else if ("items" in data) {
                // TODO: Recursively create a type for this and reference it.
                writeAttribute("any[]");
            } else {
                const attributes = omit(data, attributeMetaKeys);
                const objectTypeName = keys(NAMED_OBJECT_TYPES).find(
                    objectType =>
                        isEqualUnordered(
                            NAMED_OBJECT_TYPES[objectType],
                            keys(attributes)
                        )
                );
                if (objectTypeName != null) {
                    writeAttribute(objectTypeName);
                } else {
                    write(`${name}?: {`);
                    forEach(attributes, recursivelyWriteAttributes);
                    write("}");
                }
            }
        } else {
            const type = getAttributeType(data);
            if (type == null) {
                console.log(
                    `could not generate for valType ${JSON.stringify(
                        data.valType
                    )}`
                );
            } else {
                writeAttribute(data.arrayOk ? `OneOrMany<${type}>` : type);
            }
        }
    }

    function getDataTypeName(traceName: string) {
        return `${traceName[0].toUpperCase() + traceName.slice(1)}Data`;
    }

    function getTransformName(transformName: string) {
        return `${transformName[0].toUpperCase() +
            transformName.slice(1)}Transform`;
    }

    write(readFileSync(join(__dirname, "header_d.ts")).toString("utf-8"));
    write(readFileSync(join(__dirname, "globals_d.ts")).toString("utf-8"));

    write(
        `export type Data = ${map(schema.traces, (_, name) =>
            getDataTypeName(name)
        ).join(" | ")};`
    );

    forEach(schema.traces, (trace: AttributedObject, name) => {
        if (trace.meta) {
            writeDocComment(trace.meta.description);
        }
        write(`export interface ${getDataTypeName(name)} {`);
        write(`type: "${trace.attributes.type}";\n`);
        recursivelyWriteObjectType(trace.attributes, "type");
        write("}\n");
    });

    forEach(NAMED_FLAG_LISTS, (flags, name) => {
        write(`type ${name} = ${generateFlagListType(flags)};`);
    });
    write("");

    write(
        `export type AxisName = ${generateLiteralUnionType([
            "x",
            ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `x${i}`),
            "y",
            ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `y${i}`)
        ])};`
    );

    write("export interface LayoutXAxis {");
    recursivelyWriteObjectType(schema.layout.layoutAttributes.xaxis);
    write("}\n");

    write("export interface LayoutYAxis {");
    recursivelyWriteObjectType(schema.layout.layoutAttributes.yaxis);
    write("}\n");

    write("export interface Layout {");
    recursivelyWriteObjectType(
        schema.layout.layoutAttributes,
        "xaxis",
        "yaxis"
    );
    [
        "xaxis",
        ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `xaxis${i}`)
    ].forEach(axis => {
        write(`${axis}?: LayoutXAxis`);
    });
    [
        "yaxis",
        ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `yaxis${i}`)
    ].forEach(axis => {
        write(`${axis}?: LayoutYAxis`);
    });
    write("}\n");

    values(namedEnumerations).map(({ name, values }) => {
        if (values != null) {
            write(
                `type ${name} = ${values
                    .map(v => JSON.stringify(v))
                    .join(" | ")};`
            );
            write("");
        }
    });

    write(
        `export type Transform = ${map(schema.transforms, (_, name) =>
            getTransformName(name)
        ).join(" | ")};`
    );
    write("");

    forEach(schema.transforms, (transform: AttributedObject, name) => {
        if (transform.meta) {
            writeDocComment(transform.meta.description);
        }
        write(`export interface ${getTransformName(name)} {`);
        write(`type: "${name}";\n`);
        recursivelyWriteObjectType(transform.attributes);
        write("}\n");
    });

    write(readFileSync(join(__dirname, "events_d.ts")).toString("utf-8"));

    return write.format();
}
