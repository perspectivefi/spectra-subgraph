const fs = require("fs")
const path = require("path")
const Mustache = require("mustache")

const [$1, $2, FILENAME, TEMPLATE_PATH] = process.argv
const rootDir = "../../"

const DEFAULT = {
    TEMPLATE_PATH: path.resolve(__dirname, `${rootDir}/subgraph.template.yaml`),
    FILENAME: "subgraph",
}

const encoding = {
    encoding: "utf-8",
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2)
    const parsed = {
        network: null,
        graft: null,
        deploymentID: null,
    }

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--network" && i + 1 < args.length) {
            parsed.network = args[i + 1]
            i++
        } else if (args[i] === "--graft" && i + 1 < args.length) {
            parsed.graft = args[i + 1]
            i++
        } else if (args[i] === "--deploymentID" && i + 1 < args.length) {
            parsed.deploymentID = args[i + 1]
            i++
        }
    }

    return parsed
}

const generateConfig = (
    network,
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
        const outputFileName = `${filename}.${network}.yaml`

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

const generateConfigWithGraft = (
    network,
    graftBlock,
    deploymentID,
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

        // Render the template with Mustache
        let output = Mustache.render(template, view)

        // Add graft section after repository line and before schema
        // Find the line with "repository:" and insert graft section after it
        const lines = output.split("\n")
        const repositoryIndex = lines.findIndex((line) =>
            line.trim().startsWith("repository:")
        )

        if (repositoryIndex !== -1) {
            // Insert graft section after repository
            const graftSection = [
                "graft:",
                `  ${network}: ${deploymentID}`,
                `  block: ${graftBlock}`,
            ]
            lines.splice(repositoryIndex + 1, 0, ...graftSection)
        }

        // Update features to include grafting
        // Find the features section and add grafting if not present
        const featuresIndex = lines.findIndex((line) =>
            line.trim().startsWith("features:")
        )
        if (featuresIndex !== -1) {
            // Find the next non-indented line or end of features
            let featuresEndIndex = featuresIndex + 1
            while (
                featuresEndIndex < lines.length &&
                (lines[featuresEndIndex].trim() === "" ||
                    lines[featuresEndIndex].trim().startsWith("-"))
            ) {
                featuresEndIndex++
            }

            // Check if grafting is already present
            const hasGrafting = lines
                .slice(featuresIndex, featuresEndIndex)
                .some((line) => line.includes("grafting"))

            if (!hasGrafting) {
                // Add grafting after nonFatalErrors
                const nonFatalIndex = lines.findIndex(
                    (line, idx) =>
                        idx >= featuresIndex &&
                        idx < featuresEndIndex &&
                        line.includes("nonFatalErrors")
                )
                if (nonFatalIndex !== -1) {
                    lines.splice(nonFatalIndex + 1, 0, "  - grafting")
                } else {
                    // If nonFatalErrors not found, add grafting after features:
                    lines.splice(featuresIndex + 1, 0, "  - grafting")
                }
            }
        }

        output = lines.join("\n")
        const outputFileName = `${filename}.${network}.yaml`

        fs.writeFileSync(
            path.resolve(__dirname, rootDir, outputFileName),
            output,
            encoding
        )

        console.info(`\t - ${outputFileName}`)
    } catch (e) {
        console.trace(e)
        process.exit(1)
    }
}

// Main execution
const args = parseArgs()

// If all graft arguments are provided, generate single config with graft
if (args.network && args.graft && args.deploymentID) {
    console.info(`File(s) generated:`)
    generateConfigWithGraft(
        args.network,
        args.graft,
        args.deploymentID,
        DEFAULT.FILENAME,
        DEFAULT.TEMPLATE_PATH
    )
} else {
    // Otherwise, generate all configs (original behavior)
    console.info(`File(s) generated:`)
    try {
        fs.readdir(
            path.resolve(__dirname, `${rootDir}/src/configs`),
            (_, files) => {
                files.map((file) => {
                    const [network] = file.split(".")
                    generateConfig(network, FILENAME, TEMPLATE_PATH)
                })
            }
        )
    } catch (e) {
        console.trace(e)
    }
}
