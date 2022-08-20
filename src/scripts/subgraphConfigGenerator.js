const fs = require("fs")
const path = require("path")
const Mustache = require("mustache")

const [$1, $2, NETWORK, FILENAME, TEMPLATE_PATH] = process.argv
const rootDir = "../../"

const DEFAULT = {
    NETWORK: "mainnet",
    TEMPLATE_PATH: path.resolve(__dirname, `${rootDir}/subgraph.template.yaml`),
    FILENAME: "subgraph"
}

const encoding = {
    encoding: "utf-8"
}

const generateConfig = (
    network = DEFAULT.NETWORK,
    filename = DEFAULT.FILENAME,
    templatePath = DEFAULT.TEMPLATE_PATH
) => {
    try {
        const template = fs.readFileSync(templatePath, encoding)

        const view = JSON.parse(
            fs.readFileSync(
                path.resolve(
                    __dirname,
                    `${rootDir}/src/configs`,
                    `${network}.json`
                ),
                encoding
            )
        )

        const output = Mustache.render(template, view)
        const outputFileName =
            network === DEFAULT.NETWORK
                ? `${filename}.yaml`
                : `${filename}.${network}.yaml`

        fs.writeFileSync(
            path.resolve(__dirname, rootDir, outputFileName),
            output,
            encoding
        )

        console.info(`\t - ${outputFileName}`)
    } catch (e) {
        console.trace(e)
    }
}

console.info(`File(s) generated:`)
if (NETWORK !== "all") {
    generateConfig(NETWORK, FILENAME, TEMPLATE_PATH)
} else {
    try {
        fs.readdir(
            path.resolve(__dirname, `${rootDir}/src/configs`),
            (_, files) => {
                files.map(file => {
                    const [network] = file.split(".")
                    generateConfig(network, FILENAME, TEMPLATE_PATH)
                })
            }
        )
    } catch (e) {
        console.trace(e)
    }
}
