#!/usr/bin/env node

import CSLJson from "./CSLJson.js";

// Extract arguments, excluding the first two default ones (`node` and the script path)
const args = process.argv.slice(2);

// Default values
let style = "apa";
let locale = "en-US";

// Process each argument
const identifiers = [];
for (let i = 0; i < args.length; i++) {
    if ((args[i] === "--style" || args[i] === "-s") && args[i + 1]) {
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
            const csl = new CSLJson();

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
        console.log(
            `Unable to determine the type of these identifiers:\n${undefinedIdentifiers
                .map(([_, id]) => `[Undefined] ${id}\n`)
                .join("")}`
        );
    }

    // Process defined identifiers
    if (definedIdentifiers.length) {
        console.log(
            `Retrieving data for these identifiers:\n${definedIdentifiers
                .map(([type, id]) => `[${type}] ${id}\n`)
                .join("")}`
        );

        const contentArray = await retrieveContent(definedIdentifiers);
        const failedRetrievals = contentArray.filter((content) => content?.status === "failed");
        const successfulRetrievals = contentArray.filter((content) => content?.status !== "failed");

        // Display failed retrievals
        if (failedRetrievals.length) {
            console.log(
                `Failed to retrieve content from these identifiers:\n${failedRetrievals
                    .map(({ type, identifier }) => `[${type}] ${identifier}\n`)
                    .join("")}`
            );
        }

        // Generate references
        if (successfulRetrievals.length) {
            const csl = new CSLJson(successfulRetrievals);
            const references = await csl.toBibliography({ style, locale });
            const failedFormats = references.filter((content) => content?.status === "failed");
            const successfulFormats = references.filter((content) => content?.status !== "failed");

            // Display failed formats
            if (failedFormats.length !== 0) {
                console.log(
                    `Failed to format references for these identifiers:\n${failedFormats
                        .map(({ type, identifier }) => `[${type}] ${identifier}\n`)
                        .join("")}`
                );
            }

            // Display formatted references
            if (successfulFormats.length !== 0) {
                console.log(`References:\n${successfulFormats}`);
            }
        }
    }
})();
