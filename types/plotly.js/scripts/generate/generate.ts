/// <reference types="node" />

import { readFileSync } from "fs";
import { join } from "path";
import {
    forEach,
    omit,
    isArray,
    uniq,
    size,
    range,
    sortBy,
    isEqual,
    map,
    keys,
    flatten,
    compact,
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
    Point: ["x", "y", "z"],
    Transition: ["duration", "easing"]
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
const inferredEnumerations: Record<
    string,
    { name: string; values?: string[] }
> = {
    gregorian: {
        name: "Calendar"
    },
    "circle-open-dot": {
        name: "MarkerSymbol"
    }
};

// TODO: Support merging subsequent appearances into one interface?
const inferredObjectTypes: Record<
    string,
    { name: string; fields?: string[]; type?: string }
> = {
    annotation: {
        name: "Annotation"
    },
    tickformatstop: {
        name: "TickFormatStop"
    },
    layer: {
        name: "Layer"
    },
    button: {
        name: "Button"
    },
    dimension: {
        name: "Dimension"
    },
    shape: {
        name: "Shape"
    },
    image: {
        name: "Image"
    },
    slider: {
        name: "Slider"
    }
};

const EXPLICIT_AXIS_COUNT = 9;

function isEqualUnordered(a: string[], b: string[]) {
    return isEqual(sortBy(a), sortBy(b));
}

function flagListType(flags: string[], extras?: string[]) {
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

function unionType(...members: (string | string[])[]) {
    return flatten(members).join(" | ");
}

function literalUnionType(members: (boolean | string | number)[]) {
    return unionType(members.map(m => JSON.stringify(m)));
}

function generateDocComment(content: string, tags?: Record<string, string>) {
    if (content || (tags && size(tags) > 0)) {
        return compact([
            "/**",
            content ? ` * ${content}` : undefined,
            ...map(
                tags,
                (value, name) =>
                    value != null
                        ? ` * @${name} ${JSON.stringify(value)}`
                        : undefined
            ),
            "*/"
        ]).join("\n");
    } else {
        return "";
    }
}

function simpleType(attribute: Attribute): string | undefined {
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
            ? unionType(literalUnionType(attribute.values), "string")
            : "string";
    } else if (attribute.valType === "enumerated") {
        const values: string[] = attribute.values;

        const namedEnumeration = values
            .map(v => inferredEnumerations[v])
            .find(e => e != null);
        if (namedEnumeration != null) {
            if (namedEnumeration.values == null) {
                namedEnumeration.values = values;
                return namedEnumeration.name;
            } else if (isEqualUnordered(namedEnumeration.values, values)) {
                return namedEnumeration.name;
            } else {
                console.warn(
                    `unexpected mismatch for inferred enumeration "${
                        namedEnumeration.name
                    }"; cannot use same type name`
                );
            }
        }

        // Special-case AxisName because it appears in several positions with slightly different
        // "other" options, and so it's a pain to define named enumerations like other enumerations.
        return unionType(
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
        );
    } else if (attribute.valType === "flaglist") {
        // At least one flaglist has duplicate values. :/
        const flags = uniq(attribute.flags as string[]);

        const namedFlagList = keys(NAMED_FLAG_LISTS).find(name =>
            isEqualUnordered(NAMED_FLAG_LISTS[name], flags)
        );

        return namedFlagList == null
            ? flagListType(flags, attribute.extras)
            : unionType(
                  namedFlagList,
                  literalUnionType(attribute.extras || [])
              );
    } else if (attribute.valType === "info_array") {
        // TODO: Inspect the types of the items.
        // TODO: Is this actually a tuple type?
        // TODO: Support whatever freeLength is.
        if (isArray(attribute.items)) {
            return undefined;
        } else {
            return "any[]";
        }
    } else if (attribute.valType === "any") {
        return "any";
    } else {
        return undefined;
    }
}

function complexType(
    attribute: Attribute,
    attributeMetaKeys: string[]
): string | undefined {
    if (attribute.role === "object") {
        if ("items" in attribute) {
            if (size(attribute.items) !== 1) {
                throw new Error(
                    "cannot generate array type for more than one item type"
                );
            }
            const itemName = Object.keys(attribute.items)[0];
            if (itemName === "transform") {
                // Special-case this one because transforms are a top-level type like traces, rather than
                // the rest of the types that use "items".
                return "Transform[]";
            } else {
                const inferredObjectType = inferredObjectTypes[itemName];

                if (inferredObjectType != null) {
                    const objectFields = difference(
                        Object.keys(attribute.items[itemName]),
                        attributeMetaKeys
                    );
                    if (inferredObjectType.fields == null) {
                        inferredObjectType.fields = objectFields;
                        inferredObjectType.type = complexType(
                            attribute.items[itemName],
                            attributeMetaKeys
                        );
                        return `${inferredObjectType.name}[]`;
                    } else if (
                        isEqualUnordered(
                            inferredObjectType.fields,
                            objectFields
                        )
                    ) {
                        return `${inferredObjectType.name}[]`;
                    } else {
                        const one = difference(
                            inferredObjectType.fields,
                            attributeMetaKeys
                        );
                        const two = difference(
                            Object.keys(attribute.items[itemName]),
                            attributeMetaKeys
                        );
                        console.log(difference(one, two));
                        console.log(difference(two, one));
                        console.warn(
                            `unexpected mismatch for inferred object type "${itemName}"; cannot use same type name`
                        );
                        return "any[]";
                    }
                } else {
                    console.warn(
                        `using fall-back any[] type for item-type "${itemName}"`
                    );
                    return "any[]";
                }
            }
        } else {
            const attributes = omit(attribute, attributeMetaKeys);
            const objectTypeName = keys(NAMED_OBJECT_TYPES).find(objectType =>
                isEqualUnordered(
                    NAMED_OBJECT_TYPES[objectType],
                    keys(attributes)
                )
            );
            if (objectTypeName != null) {
                return objectTypeName;
            } else {
                return `{\n${map(attributes, (attr, field) =>
                    generateField(attr, field, attributeMetaKeys)
                ).join("\n")}\n}\n`;
            }
        }
    } else {
        const type = simpleType(attribute);
        if (type == null) {
            console.warn(
                `could not generate type for valType ${JSON.stringify(
                    attribute.valType
                )}`
            );
            // TODO
            return undefined;
        } else {
            return attribute.arrayOk ? `OneOrMany<${type}>` : type;
        }
    }
}

function generateField(
    attribute: Attribute,
    fieldName: string,
    attributeMetaKeys: string[]
) {
    return `${generateDocComment(
        attribute.description,
        attribute.dflt == null ? {} : { default: attribute.dflt }
    )}\n${fieldName}?: ${complexType(attribute, attributeMetaKeys)};\n`;
}

export default function generate(schema: any) {
    const write = writer();

    const attributeMetaKeys = [...schema.defs.metaKeys, "valType"];

    function writeObjectFields(
        data: object,
        ...omitKeys: (string | string[])[]
    ) {
        forEach(omit(data, attributeMetaKeys, ...omitKeys), (attr, field) =>
            write(generateField(attr, field, attributeMetaKeys) || "")
        );
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
        `export type Data = ${unionType(
            map(schema.traces, (_, name) => getDataTypeName(name))
        )};`
    );

    forEach(schema.traces, (trace: AttributedObject, name) => {
        if (trace.meta) {
            write(generateDocComment(trace.meta.description));
        }
        write(`export interface ${getDataTypeName(name)} {`);
        write(`type: "${trace.attributes.type}";\n`);
        writeObjectFields(trace.attributes, "type");
        write("}\n");
    });

    forEach(NAMED_FLAG_LISTS, (flags, name) => {
        write(`type ${name} = ${flagListType(flags)};`);
    });
    write("");

    write(
        `export type AxisName = ${literalUnionType([
            "x",
            ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `x${i}`),
            "y",
            ...range(2, EXPLICIT_AXIS_COUNT + 1).map(i => `y${i}`)
        ])};`
    );

    write("export interface LayoutXAxis {");
    writeObjectFields(schema.layout.layoutAttributes.xaxis);
    write("}\n");

    write("export interface LayoutYAxis {");
    writeObjectFields(schema.layout.layoutAttributes.yaxis);
    write("}\n");

    write("export interface Layout {");
    writeObjectFields(schema.layout.layoutAttributes, "xaxis", "yaxis");
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

    write(
        `export type Transform = ${unionType(
            map(schema.transforms, (_, name) => getTransformName(name))
        )};`
    );
    write("");

    forEach(schema.transforms, (transform: AttributedObject, name) => {
        if (transform.meta) {
            write(generateDocComment(transform.meta.description));
        }
        write(`export interface ${getTransformName(name)} {`);
        write(`type: "${name}";\n`);
        writeObjectFields(transform.attributes);
        write("}\n");
    });

    forEach(inferredEnumerations, ({ name, values }) => {
        if (values != null) {
            write(`type ${name} = ${literalUnionType(values)};`);
            write("");
        }
    });

    forEach(inferredObjectTypes, ({ name, type }) => {
        if (type != null) {
            write(`interface ${name}`);
            write(type);
            write("\n");
        }
    });

    write(readFileSync(join(__dirname, "events_d.ts")).toString("utf-8"));

    return write.format();
}
