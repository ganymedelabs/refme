#!/usr/bin/env node

import CSLJson from "./CSLJson.js";

const FONT = {
    BOLD: "\x1b[1m",
    GREEN: "\x1b[38;5;48m",
    BLUE: "\x1b[38;5;33m",
    RED: "\x1b[38;5;9m",
    BLACK: "\x1b[38;5;0m",
    BG_GREEN: "\x1b[48;5;48m",
    BG_RED: "\x1b[48;5;9m",
    RESET: "\x1b[0m",
};

const RESULT = {
    SUCCESS: `${FONT.BG_GREEN}${FONT.BOLD}${FONT.BLACK} SUCCESS ${FONT.RESET}`,
    FAIL: `${FONT.BG_RED}${FONT.BOLD}${FONT.BLACK} FAIL ${FONT.RESET}`,
};

// Extract arguments, excluding the first two default ones (`node` and the script path)
const args = process.argv.slice(2);

// Default values
let style = "apa";
let locale = "en-US";
let logErrors = false;

// Process each argument
const identifiers = [];
if (args.length === 0) {
    process.stdout.write("");
} else {
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--log-errors" || args[i] === "-e") {
            logErrors = true;
        } else if ((args[i] === "--style" || args[i] === "-s") && args[i + 1]) {
            style = args[i + 1];
            i++; // Skip the next argument as it's the style value
        } else if ((args[i] === "--locale" || args[i] === "-l") && args[i + 1]) {
            locale = args[i + 1];
            i++; // Skip the next argument as it's the locale value
        } else {
            // Assume anything else is an identifier
            identifiers.push(args[i]);
        }
    }
}

function logLoading() {
    const loadingCharacters = "⣾⣽⣻⢿⡿⣟⣯⣷";
    let index = 0;

    const intervalId = setInterval(() => {
        process.stdout.write("\r" + loadingCharacters[index] + " ");

        index = (index + 1) % loadingCharacters.length;
    }, 100);

    return function logDone(doneString = "Done") {
        clearInterval(intervalId);
        process.stdout.write(`\r${doneString}`);
    };
}

function recognizeIdentifierType(string) {
    const trimmedString = string.trim();

    if (trimmedString.startsWith("url:")) return ["URL", trimmedString.slice(4).trim()];
    if (trimmedString.startsWith("doi:")) return ["DOI", trimmedString.slice(4).trim()];
    if (trimmedString.startsWith("pmcid:")) return ["PMCID", trimmedString.slice(6).trim()];
    if (trimmedString.startsWith("pmid:")) return ["PMID", trimmedString.slice(5).trim()];
    if (trimmedString.startsWith("isbn:")) return ["ISBN", trimmedString.slice(5).trim()];

    const patterns = {
        DOI: /^((https?:\/\/)?(?:dx\.)?doi\.org\/)?10\.\d{4,9}\/[-._;()/:a-zA-Z0-9]+$/,
        URL: /^(https?:\/\/)[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+$/,
        PMCID: /^PMC\d+$/,
        PMID: /^\d{7,10}$/,
        ISBN: /^(97[89])\d{9}(\d|X)$/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(trimmedString)) return [type, trimmedString];
    }

    return ["undefined", trimmedString];
}

async function retrieveContent(identifiers) {
    const contentArray = await Promise.all(
        identifiers.map(async (identifier) => {
            const [identifierType, cleanedIdentifier] = identifier;
            const csl = new CSLJson({}, { logErrors });

            switch (identifierType) {
                case "URL":
                    return await csl.fromURL(cleanedIdentifier);
                case "DOI":
                    return await csl.fromDOI(cleanedIdentifier);
                case "PMCID":
                    return await csl.fromPMCID(cleanedIdentifier);
                case "PMID":
                    return await csl.fromPMID(cleanedIdentifier);
                case "ISBN":
                    return await csl.fromISBN(cleanedIdentifier);
                default:
                    return null;
            }
        })
    );

    return contentArray;
}

(async () => {
    // Parse and classify identifiers
    const parsedIdentifiers = identifiers.map(recognizeIdentifierType);
    const definedIdentifiers = parsedIdentifiers.filter(([type]) => type !== "undefined");
    const undefinedIdentifiers = parsedIdentifiers.filter(([type]) => type === "undefined");

    // Display undefined identifiers
    if (undefinedIdentifiers.length) {
        process.stdout.write(
            `${FONT.RED + FONT.BOLD}Unable to determine the type of these identifiers:${
                FONT.RESET
            }\n${undefinedIdentifiers.map(([_, id]) => `${FONT.RED}[Undefined]${FONT.RESET} ${id}\n`).join("")}\n`
        );
    }

    // Process defined identifiers
    if (definedIdentifiers.length) {
        process.stdout.write(
            `${FONT.BLUE + FONT.BOLD}Retrieving data for these identifiers:${FONT.RESET}\n${definedIdentifiers
                .map(([type, id]) => `${FONT.BLUE}[${type}]${FONT.RESET} ${id}\n`)
                .join("")}\n`
        );

        const logDone = logLoading();
        const contentArray = await retrieveContent(definedIdentifiers);
        const failedRetrievals = contentArray.filter((content) => content?.status === "failed");
        const successfulRetrievals = contentArray.filter((content) => content?.status !== "failed");
        logDone("");

        // Display failed retrievals
        if (failedRetrievals.length) {
            process.stdout.write(
                `${FONT.RED + FONT.BOLD}Failed to retrieve content from these identifiers:${
                    FONT.RESET
                }\n${failedRetrievals
                    .map(({ type, identifier }) => `${FONT.RED}[${type}]${FONT.RESET} ${identifier}\n`)
                    .join("")}\n`
            );
        }

        // Generate references
        if (successfulRetrievals.length) {
            const logDone = logLoading();
            const csl = new CSLJson(successfulRetrievals, { logErrors });
            const references = await csl.toBibliography({ style, locale });
            logDone("");

            if (!references) {
                // Display failed status
                process.stdout.write(
                    `${RESULT.FAIL} ${FONT.RED + FONT.BOLD}Failed to format references!${FONT.RESET}\n`
                );
            } else {
                // Display formatted references
                process.stdout.write(
                    `${RESULT.SUCCESS} ${FONT.GREEN + FONT.BOLD}Successfully generated references:${
                        FONT.RESET
                    }\n${references}\n`
                );
            }
        }
    }
})();
