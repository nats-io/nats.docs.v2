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
            "getting-started-publish": "examples/docs/getting-started-publish/main.go",
            "getting-started-subscribe": "examples/docs/getting-started-subscribe/main.go",
            "publish-subscribe-basic": "examples/docs/publish-subscribe-basic/main.go",
            "subjects-single-wildcard": "examples/docs/subjects-single-wildcard/main.go",
            "subjects-multi-wildcard": "examples/docs/subjects-multi-wildcard/main.go",
            "subjects-monitoring": "examples/docs/subjects-monitoring/main.go",
            "queue-groups-basic": "examples/docs/queue-groups-basic/main.go",
            "queue-groups-dynamic-scaling": "examples/docs/queue-groups-dynamic-scaling/main.go",
            "queue-groups-request-reply": "examples/docs/queue-groups-request-reply/main.go",
            "queue-groups-mixed-subscribers": "examples/docs/queue-groups-mixed-subscribers/main.go",
            "request-reply-basic": "examples/docs/request-reply-basic/main.go",
            "request-reply-timeout": "examples/docs/request-reply-timeout/main.go",
            "request-reply-multiple-responders": "examples/docs/request-reply-multiple-responders/main.go",
            "request-reply-no-responders": "examples/docs/request-reply-no-responders/main.go",
            "request-reply-headers": "examples/docs/request-reply-headers/main.go",
            "request-reply-calculator": "examples/docs/request-reply-calculator/main.go",
        },
    },
    "rust": {
        repo: "nats-io/nats.rs",
        branch: "doc-examples",
        examples: {
            "basics-publish": "async-nats/examples/docs_basics_publish.rs",
            "basics-subscribe": "async-nats/examples/docs_basics_subscribe.rs",
            "getting-started-publish": "async-nats/examples/docs_getting_started_publish.rs",
            "getting-started-subscribe": "async-nats/examples/docs_getting_started_subscribe.rs",
            "publish-subscribe-basic": "async-nats/examples/docs_publish_subscribe_basic.rs",
            "subjects-single-wildcard": "async-nats/examples/docs_subjects_single_wildcard.rs",
            "subjects-multi-wildcard": "async-nats/examples/docs_subjects_multi_wildcard.rs",
            "subjects-monitoring": "async-nats/examples/docs_subjects_monitoring.rs",
            "queue-groups-basic": "async-nats/examples/docs_queue_groups_basic.rs",
            "queue-groups-dynamic-scaling": "async-nats/examples/docs_queue_groups_dynamic_scaling.rs",
            "queue-groups-request-reply": "async-nats/examples/docs_queue_groups_request_reply.rs",
            "queue-groups-mixed-subscribers": "async-nats/examples/docs_queue_groups_mixed_subscribers.rs",
            "request-reply-basic": "async-nats/examples/docs_request_reply_basic.rs",
            "request-reply-timeout": "async-nats/examples/docs_request_reply_timeout.rs",
            "request-reply-multiple-responders": "async-nats/examples/docs_request_reply_multiple_responders.rs",
            "request-reply-no-responders": "async-nats/examples/docs_request_reply_no_responders.rs",
            "request-reply-headers": "async-nats/examples/docs_request_reply_headers.rs",
            "request-reply-calculator": "async-nats/examples/docs_request_reply_calculator.rs",
        },
    },
    // Other languages will be added when they adopt the pattern
    "javascript": {
        repo: "nats-io/nats.js",
        branch: "doc-examples",
        examples: {
            "getting-started-publish": "examples/docs/getting-started-publish/index.ts",
            "getting-started-subscribe": "examples/docs/getting-started-subscribe/index.ts",
            // TODO: Add more when JavaScript adopts [page]-[snippet] pattern
        },
    },
    "python": {
        repo: "nats-io/nats.py",
        branch: "doc-examples",
        examples: {
            // TODO: Add when Python adopts [page]-[snippet] pattern
        },
    },
    "java": [
        {
            repo: "nats-io/nats.java",
            branch: "main",
            directory: "src/examples/java/io/nats/examples/natsIoDoc/",
            examples: {
                "basics-publish": "BasicsPublish.java",
                "basics-subscribe": "BasicsSubscribe.java",
                "getting-started-publish": "GettingStartedPublish.java",
                "getting-started-subscribe": "GettingStartedSubscribe.java",
                "publish-subscribe-basic": "PublishSubscribeBasic.java",
                "subjects-single-wildcard": "SubjectsSingleWildcard.java",
                "subjects-multi-wildcard": "SubjectsMultiWildcard.java",
                "queue-groups-basic": "QueueGroupsBasic.java"
            }
        },
        {
            repo: "nats-io/nats.java",
            branch: "doc-examples",
            directory: "src/examples/java/io/nats/examples/natsIoDoc/",
            examples: {
                "subjects-monitoring": "SubjectsMonitoring.java",
                "request-reply-basic": "RequestReplyBasic.java",
            }
        }
    ],
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

    for (const [language, configOrArrayOfConfigs] of Object.entries(EXAMPLES_CONFIG)) {
        console.log(`\nFetching examples for ${language}...`);
        results[language] = {};
        metadata.examples[language] = {};

        const configs = Array.isArray(configOrArrayOfConfigs) ? configOrArrayOfConfigs : [configOrArrayOfConfigs];
        for (const config of configs) {
            await fetchExample(results, metadata, language, config)
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

async function fetchExample(results, metadata, language, config) {
    // Skip if no examples defined yet
    if (Object.keys(config.examples).length === 0) {
        console.log(`  ⏭ Skipping ${language} - no examples defined yet`);
        return;
    }

    directory = ""
    if (config.directory != null) {
        directory = config.directory
        console.log(`⌘ Examples Directory: ${directory}`)
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
                directory + examplePath,
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
