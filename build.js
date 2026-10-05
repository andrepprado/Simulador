const fs = require("fs");
const path = require("path");
const { minify } = require("terser");
const JavaScriptObfuscator = require("javascript-obfuscator");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const JS = path.join(ROOT, "js");

function copyDir(src, dst) {
    fs.mkdirSync(dst, { recursive: true });

    for (const item of fs.readdirSync(src, { withFileTypes: true })) {
        const a = path.join(src, item.name);
        const b = path.join(dst, item.name);

        if (item.isDirectory()) {
            copyDir(a, b);
        } else {
            fs.copyFileSync(a, b);
        }
    }
}

async function protect(src, dst) {
    const source = fs.readFileSync(src, "utf8");

    const minified = await minify(source, {
        compress: { passes: 2 },
        mangle: true,
        format: { comments: false },
        sourceMap: false
    });

    const result = JavaScriptObfuscator.obfuscate(minified.code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.35,
        identifierNamesGenerator: "hexadecimal",
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 8,
        stringArray: true,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        sourceMap: false
    });

    fs.writeFileSync(dst, result.getObfuscatedCode(), "utf8");
}

async function build() {
    fs.rmSync(DIST, { recursive: true, force: true });
    fs.mkdirSync(DIST, { recursive: true });
    fs.mkdirSync(path.join(DIST, "js"), { recursive: true });

    for (const file of fs.readdirSync(ROOT)) {
        if (file.endsWith(".html") || file === "style.css") {
            fs.copyFileSync(
                path.join(ROOT, file),
                path.join(DIST, file)
            );
        }
    }

    if (fs.existsSync(path.join(ROOT, "img"))) {
        copyDir(
            path.join(ROOT, "img"),
            path.join(DIST, "img")
        );
    }

    for (const item of fs.readdirSync(JS, { withFileTypes: true })) {
        const src = path.join(JS, item.name);
        const dst = path.join(DIST, "js", item.name);

        if (item.isDirectory()) {
            copyDir(src, dst);
            console.log("Copied vendor:", item.name);
            continue;
        }

        if (item.name.endsWith(".js")) {
            await protect(src, dst);
            console.log("Protected:", item.name);
        } else {
            fs.copyFileSync(src, dst);
        }
    }

    console.log("");
    console.log("Build completed.");
}

build().catch(err => {
    console.error(err);
    process.exit(1);
});
