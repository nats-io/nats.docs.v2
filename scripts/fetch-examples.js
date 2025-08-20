#!/usr/bin/env node

/**
 * Script to fetch code examples from NATS client repositories
 * This allows us to keep documentation in sync with actual client examples
 */

const fs = require("fs").promises;
const path = require("path");
const https = require("https");

// Configuration for NATS client repositories and example paths
// All examples use pattern: [page]-[snippet]
// Go: examples/docs/[page]-[snippet]/main.go
// Rust: async-nats/examples/docs_[page]_[snippet].rs
// Others: TBD when they adopt the pattern
const EXAMPLES_CONFIG = {
    "go": {
        repo: "nats-io/nats.go",
        branch: "doc-examples",
        examples: {
            "basics-publish": "examples/docs/basics-publish/main.go",
            "basics-subscribe": "examples/docs/basics-subscribe/main.go",
            // Add more as they become available
        },
    },
    "rust": {
        repo: "nats-io/nats.rs",
        branch: "doc-examples",
        examples: {
            "basics-publish": "async-nats/examples/docs_basics_publish.rs",
            "basics-subscribe": "async-nats/examples/docs_basics_subscribe.rs",
            // Add more as they become available
        },
    },
    // Other languages will be added when they adopt the pattern
    "javascript": {
        repo: "nats-io/nats.js",
        branch: "doc-examples",
        examples: {
            // TODO: Add when JavaScript adopts [page]-[snippet] pattern
        },
    },
    "python": {
        repo: "nats-io/nats.py",
        branch: "doc-examples",
        examples: {
            // TODO: Add when Python adopts [page]-[snippet] pattern
        },
    },
    "java": {
        repo: "nats-io/nats.java",
        branch: "doc-examples",
        examples: {
            // TODO: Add when Java adopts [page]-[snippet] pattern
        },
    },
    "csharp": {
        repo: "nats-io/nats.net",
        branch: "doc-examples",
        examples: {
            // TODO: Add when C# adopts [page]-[snippet] pattern
        },
    },
};

// Output directory for fetched examples
const OUTPUT_DIR = path.join(__dirname, "..", "static", "examples", "snippets");

/**
 * Fetch a file from GitHub
 */
function fetchFromGitHub(repo, branch, filePath) {
    return new Promise((resolve, reject) => {
        const url =
            `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
        console.log(`Fetching: ${url}`);

        https.get(url, (response) => {
            let data = "";

            response.on("data", (chunk) => {
                data += chunk;
            });

            response.on("end", () => {
                if (response.statusCode === 200) {
                    resolve(data);
                } else {
                    reject(
                        new Error(
                            `Failed to fetch ${url}: ${response.statusCode}`,
                        ),
                    );
                }
            });
        }).on("error", reject);
    });
}

/**
 * Extract relevant code snippet from full example file
 * Looks for NATS-DOC-START and NATS-DOC-END markers to extract specific sections
 * Falls back to full code if no markers are present
 */
function extractSnippet(code, language, type) {
    // Pattern works for both // and # style comments
    const startPattern = /^[\s]*[#\/]+\s*NATS-DOC-START/;
    const endPattern = /^[\s]*[#\/]+\s*NATS-DOC-END/;

    const lines = code.split("\n");
    const result = [];
    let inSection = false;

    for (const line of lines) {
        if (startPattern.test(line)) {
            inSection = true;
            continue; // Skip the marker line itself
        }
        if (endPattern.test(line)) {
            inSection = false;
            continue; // Skip the marker line itself
        }
        if (inSection) {
            result.push(line);
        }
    }

    // Clean up indentation from extracted lines
    if (result.length > 0) {
        // Find minimum indentation (excluding empty lines)
        const minIndent = result
            .filter((line) => line.trim().length > 0)
            .reduce((min, line) => {
                const match = line.match(/^[\t ]*/);
                return Math.min(min, match ? match[0].length : 0);
            }, Infinity);

        // Remove minimum indentation from all lines
        const cleanedResult = result.map((line) => {
            if (line.trim().length === 0) return line; // Keep empty lines as-is
            // Remove minIndent characters from start
            return line.substring(minIndent);
        });

        const extracted = cleanedResult.join("\n").trim();
        console.log(`  ✓ Extracted marked section (${result.length} lines)`);
        return extracted;
    } else if (lines.some((l) => startPattern.test(l))) {
        console.log(`  ⚠ Found markers but no content between them`);
        return code;
    } else {
        console.log(`  ℹ No markers found, using full code`);
        return code;
    }
}

/**
 * Parse example type into page and snippet
 * e.g., "basics-publish" -> { page: "basics", snippet: "publish" }
 */
function parseExampleType(exampleType) {
    const parts = exampleType.split("-");
    if (parts.length >= 2) {
        const snippet = parts[parts.length - 1]; // Last part is the snippet
        const page = parts.slice(0, -1).join("-"); // Everything else is the page
        return { page, snippet };
    }
    // Fallback for examples without proper naming
    return { page: "misc", snippet: exampleType };
}

/**
 * Fetch all examples for all languages
 */
async function fetchAllExamples() {
    // Create output directory if it doesn't exist
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const results = {};
    const metadata = {
        timestamp: new Date().toISOString(),
        examples: {},
    };

    for (const [language, config] of Object.entries(EXAMPLES_CONFIG)) {
        console.log(`\nFetching examples for ${language}...`);
        results[language] = {};
        metadata.examples[language] = {};

        // Skip if no examples defined yet
        if (Object.keys(config.examples).length === 0) {
            console.log(`  ⏭ Skipping ${language} - no examples defined yet`);
            continue;
        }

        // Create language directory
        const langDir = path.join(OUTPUT_DIR, language);
        await fs.mkdir(langDir, { recursive: true });

        for (
            const [exampleType, examplePath] of Object.entries(config.examples)
        ) {
            try {
                const code = await fetchFromGitHub(
                    config.repo,
                    config.branch,
                    examplePath,
                );
                const originalLines = code.split("\n").length;
                const snippet = extractSnippet(code, language, exampleType);
                const extractedLines = snippet.split("\n").length;

                // Parse page and snippet from example type
                const { page, snippet: snippetName } = parseExampleType(
                    exampleType,
                );

                // Create page directory
                const pageDir = path.join(langDir, page);
                await fs.mkdir(pageDir, { recursive: true });

                // Save the snippet in page/snippet.ext structure
                const outputPath = path.join(
                    pageDir,
                    `${snippetName}.${getFileExtension(language)}`,
                );
                await fs.writeFile(outputPath, snippet);

                // Store metadata
                metadata.examples[language][exampleType] = {
                    path: outputPath.replace(OUTPUT_DIR + "/", ""),
                    page: page,
                    snippet: snippetName,
                    originalLines: originalLines,
                    extractedLines: extractedLines,
                    markersFound: originalLines !== extractedLines,
                };

                results[language][exampleType] = outputPath;
                console.log(
                    `  ✓ ${exampleType} -> ${page}/${snippetName}.${getFileExtension(language)
                    }`,
                );
            } catch (error) {
                console.error(`  ✗ ${exampleType}: ${error.message}`);
                results[language][exampleType] = null;
                metadata.examples[language][exampleType] = {
                    error: error.message,
                };
            }
        }
    }

    // Process local CLI examples
    const cliMetadata = await processCLIExamples();
    if (cliMetadata.cli) {
        metadata.examples.cli = cliMetadata.cli;
    }

    // Save metadata about fetched examples
    const metadataPath = path.join(OUTPUT_DIR, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    console.log("\nExamples fetched successfully!");
    console.log(`Saved to: ${OUTPUT_DIR}`);
    return results;
}

/**
 * Get file extension for a language
 */
function getFileExtension(language) {
    const extensions = {
        "javascript": "js",
        "go": "go",
        "python": "py",
        "java": "java",
        "rust": "rs",
        "csharp": "cs",
        "cli": "sh",
    };
    return extensions[language] || "txt";
}

/**
 * Process local CLI examples from static/examples/snippets/cli
 */
async function processCLIExamples() {
    const cliDir = path.join(
        __dirname,
        "..",
        "static",
        "examples",
        "snippets",
        "cli",
    );
    const metadata = {};

    console.log("\nProcessing local CLI examples...");

    try {
        // Check if CLI directory exists
        await fs.access(cliDir);

        // Recursively find all .sh files in the CLI directory
        async function findCLIFiles(dir, relativePath = "") {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const files = {};

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = relativePath
                    ? path.join(relativePath, entry.name)
                    : entry.name;

                if (entry.isDirectory()) {
                    // Recursively process subdirectories
                    const subFiles = await findCLIFiles(fullPath, relPath);
                    Object.assign(files, subFiles);
                } else if (entry.isFile() && entry.name.endsWith(".sh")) {
                    // Process .sh files
                    const content = await fs.readFile(fullPath, "utf8");
                    const lines = content.split("\n").length;

                    // Parse directory structure to create example type
                    // e.g., basics/publish.sh -> basics-publish
                    const pathParts = relPath.split(path.sep);
                    const fileName = pathParts.pop().replace(".sh", "");
                    const exampleType = pathParts.length > 0
                        ? `${pathParts.join("-")}-${fileName}`
                        : fileName;

                    // Store metadata
                    files[exampleType] = {
                        path: `cli/${relPath}`,
                        page: pathParts.length > 0
                            ? pathParts.join("-")
                            : "misc",
                        snippet: fileName,
                        originalLines: lines,
                        extractedLines: lines,
                        markersFound: false,
                        source: "local",
                    };

                    console.log(`  ✓ ${exampleType} -> ${relPath}`);
                }
            }

            return files;
        }

        metadata["cli"] = await findCLIFiles(cliDir);

        if (Object.keys(metadata["cli"]).length === 0) {
            console.log("  ⚠ No CLI examples found");
        }
    } catch (error) {
        if (error.code === "ENOENT") {
            console.log("  ⚠ CLI examples directory not found");
            metadata["cli"] = {};
        } else {
            console.error(
                `  ✗ Error processing CLI examples: ${error.message}`,
            );
            metadata["cli"] = { error: error.message };
        }
    }

    return metadata;
}

// Run the script
if (require.main === module) {
    fetchAllExamples().catch(console.error);
}

module.exports = {
    fetchAllExamples,
    EXAMPLES_CONFIG,
    extractSnippet,
    parseExampleType,
    processCLIExamples,
};
