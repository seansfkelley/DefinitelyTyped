import axios from "axios";

// https://api.plot.ly/v2/plot-schema
type PlotlySchemaResponse = {
    sha1: string;
    modified: true;
    schema: object;
} | {
    sha1: string;
    modified: false;
};

// TODO: Read from file.
const sha1 = '';

axios.get(`https://api.plot.ly/v2/plot-schema?sha1={sha1}`)
    .then(response => {
        return response.data as PlotlySchemaResponse;
    })
