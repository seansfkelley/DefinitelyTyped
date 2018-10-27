import { format } from "prettier";

export default function writer() {
    const contents: string[] = [];

    const fn = function(content: string) {
        contents.push(content);
    };

    fn.format = () => {
        return format(contents.join('\n'), {
            parser: "typescript",
        });
    };

    return fn;
}
