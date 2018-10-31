/// <reference types="node" />

import axios from "axios";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import generate from "./generate";

// https://api.plot.ly/v2/plot-schema
type PlotlySchemaResponse =
    | {
          sha1: string;
          modified: true;
          schema: any;
      }
    | {
          sha1: string;
          modified: false;
      };

const outputPath = join(__dirname, "..", "..", "index-generated.d.ts");
const generatedTsd = generate(require(join(__dirname, "plotly.json")).schema);

try {
    unlinkSync(outputPath);
} catch {}
writeFileSync(outputPath, generatedTsd);

// Blank sha1 is required, per the docs.
// axios.get("https://api.plot.ly/v2/plot-schema?sha1=").then(response => {
//     writeFileSync(
//         join(__dirname, "plotly.json"),
//         JSON.stringify(response.data as PlotlySchemaResponse, null, 2)
//     );
// });
