/// <reference types="node" />

import axios from "axios";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import generate from "./generate";

// https://api.plot.ly/v2/plot-schema
type PlotlySchemaResponse = {
    sha1: string;
    modified: true;
    schema: any;
} | {
    sha1: string;
    modified: false;
};


const generatedTsd = generate(require(join(__dirname, "plotly.json")).schema);

const OUTPUT_PATH = join(__dirname, "..", "..", "index-generated.d.ts");

try {
    unlinkSync(OUTPUT_PATH);
} catch {}
writeFileSync(OUTPUT_PATH, generatedTsd);

// TODO: Read from file.
const sha1 = '';

// axios.get(`https://api.plot.ly/v2/plot-schema?sha1={sha1}`)
//     .then(response => {
//         writeFileSync(join(__dirname, "plotly.json"), JSON.stringify(response.data as PlotlySchemaResponse, null, 2));
//     })
