#!/usr/bin/env node

const CSLJson = require("./CSLJson.js");
const pkg = require("../package.json");
const { FONT, RESULT, HELP_MESSAGE } = require("./common.js");

function logLoading() {
    const loadingCharacters = "⣾⣽⣻⢿⡿⣟⣯⣷";
    let index = 0;

    const intervalId = setInterval(() => {
        process.stdout.write(`\r${loadingCharacters[index]} `);

        index = (index + 1) % loadingCharacters.length;
    }, 100);

    return function logDone(doneString = "Done") {
        clearInterval(intervalId);
        process.stdout.write(`\r${doneString}`);
    };
}

function parseArguments(args) {
    const identifiers = [];
    let style = "apa";
    let locale = "en-US";
    let logErrors = false;
    let showVersion = false;

    const regexes = {
        showVersion: /^-{1,2}v(ersion)?$/,
        logErrors: /^-{1,2}e(rrors)?$/,
        style: /^-{1,2}s(tyle)?$/,
        locale: /^-{1,2}l(ocale)?$/,
    };

    for (let i = 0; i < args.length; i++) {
        if (regexes.showVersion.test(args[i])) {
            showVersion = true;
        } else if (regexes.logErrors.test(args[i])) {
            logErrors = true;
        } else if (regexes.style.test(args[i]) && args[i + 1]) {
            style = args[i + 1];
            i++;
        } else if (regexes.locale.test(args[i]) && args[i + 1]) {
            locale = args[i + 1];
            i++;
        } else if (!args[i].startsWith("-")) {
            identifiers.push(args[i].replace("\\-", "-"));
        }
    }

    return { identifiers, style, locale, logErrors, showVersion };
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
        const testString = type === "ISBN" ? trimmedString.replace(/-/g, "") : trimmedString;
        if (pattern.test(testString)) {
            return [type, trimmedString];
        }
    }

    return ["undefined", trimmedString];
}

async function retrieveContent(identifiers, logErrors) {
    const contentArray = await Promise.all(
        identifiers.map(async (identifier) => {
            const [identifierType, cleanedIdentifier] = identifier;
            const csl = new CSLJson({}, { logErrors });

            /* eslint-disable indent */
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
            /* eslint-enable indent */
        })
    );

    return contentArray;
}

async function main() {
    const { identifiers, style, locale, logErrors, showVersion } = parseArguments(process.argv.slice(2));

    // Show version or help message if no identifiers were provided
    if (showVersion) {
        process.stdout.write(`${pkg.version}\n`);
    } else if (identifiers.length === 0) {
        process.stdout.write(HELP_MESSAGE);
        return;
    }

    // Parse and classify identifiers
    const parsedIdentifiers = identifiers.map(recognizeIdentifierType);
    const definedIdentifiers = parsedIdentifiers.filter(([type]) => type !== "undefined");
    const undefinedIdentifiers = parsedIdentifiers.filter(([type]) => type === "undefined");

    // Display undefined identifiers
    if (undefinedIdentifiers.length) {
        process.stdout.write(
            `${FONT.RED + FONT.BOLD}Unable to determine the type of these identifiers:${
                FONT.RESET
            }\n${undefinedIdentifiers.map(([_, id]) => `${FONT.RED}[Undefined]${FONT.RESET} ${id}\n`).join("")}\n` // eslint-disable-line no-unused-vars
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
        const contentArray = await retrieveContent(definedIdentifiers, logErrors);
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
}

module.exports = { FONT, RESULT, HELP_MESSAGE };

main();
