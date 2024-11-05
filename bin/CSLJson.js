import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import { JSDOM } from "jsdom";

class CSLJson {
    constructor(cslJson, options = { logErrors: false }) {
        this.cslJson = cslJson;
        this.options = options;
    }

    #CORS_PROXY = "https://corsproxy.io/?";

    async #getCslFile(style) {
        try {
            const response = await fetch(
                `${
                    this.#CORS_PROXY
                }https://raw.githubusercontent.com/citation-style-language/styles/master/${style}.csl`
            );
            return await response.text();
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
        }
    }

    async #getLocaleFile(lang) {
        try {
            const response = await fetch(
                `${
                    this.#CORS_PROXY
                }https://raw.githubusercontent.com/citation-style-language/locales/master/locales-${lang}.xml`
            );
            return await response.text();
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
        }
    }

    #createDateObject(yearOrDate, month, day) {
        let year, adjustedMonth, adjustedDay;

        if (yearOrDate instanceof Date) {
            year = yearOrDate.getFullYear();
            adjustedMonth = yearOrDate.getMonth() + 1;
            adjustedDay = yearOrDate.getDate();
        } else {
            year = yearOrDate;
            adjustedMonth = month ?? undefined;
            adjustedDay = day ?? undefined;
        }

        const dateParts = [year];

        if (adjustedMonth) {
            dateParts.push(adjustedMonth);

            if (typeof adjustedMonth === "number" && adjustedDay) {
                dateParts.push(adjustedDay);
            }
        }

        const dateObject = {
            "date-parts": [dateParts],
        };

        return dateObject;
    }

    async fromDOI(doi) {
        try {
            const response = await fetch(`${this.#CORS_PROXY}https://api.crossref.org/works/${doi}`);

            const data = await response.json();
            const { message } = data;

            return {
                DOI: message.DOI,
                URL: message.URL || message.DOI ? `https://doi.org/${message.DOI}` : undefined,
                ISSN: message.ISSN,
                PMID: message.PMID,
                PMCID: message.PMCI,
                "container-title": message["container-title"],
                issue: message.issue,
                issued: message.issued,
                page: message.page,
                "publisher-place": message["publisher-place"],
                source: message.source,
                title: message.title,
                volume: message.volume,
                online: true,
                type: message.type === "journal-article" ? "article-journal" : message.type,
                accessed: this.#createDateObject(new Date()),
                author: message.author,
            };
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return { identifier: doi, type: "DOI", status: "failed" };
        }
    }

    async fromURL(url) {
        function createAuthorsArray(authors) {
            const authorsArray = authors.map((author) => {
                const names = author.split(/\s+/);
                const given = names.shift() || "";
                const family = names.join(" ");
                return { given, family };
            });

            return authorsArray;
        }

        function extractAuthors(doc) {
            let authors = [];

            const authorElement = doc.querySelector('.author[rel="author"]');
            if (authorElement) authors.push(authorElement.textContent || "");

            doc.querySelectorAll('meta[name="author"], meta[name="article:author"]').forEach((meta) => {
                authors.push(meta.getAttribute("content") || "");
            });

            doc.querySelectorAll('span.css-1baulvz.last-byline[itemprop="name"]').forEach((span) => {
                authors.push(span.textContent?.trim() || "");
            });

            authors = authors.filter((author, index, self) => author.trim() !== "" && self.indexOf(author) === index);

            return createAuthorsArray(authors);
        }

        function extractContent(doc, selector, attr) {
            const element = doc.querySelector(selector);

            if (!element) {
                return "";
            }

            if (attr) {
                return element.hasAttribute(attr) ? element.getAttribute(attr) || "" : element.textContent || "";
            }
            return element.textContent || "";
        }

        try {
            const response = await fetch(`${this.#CORS_PROXY}${url}`);
            const text = await response.text();

            const dom = new JSDOM(text);
            const doc = dom.window.document;

            return {
                type: "webpage",
                title: extractContent(doc, "title", ""),
                author: extractAuthors(doc),
                "container-title": [extractContent(doc, 'meta[property="og:site_name"]', "content")],
                publisher: extractContent(doc, 'meta[property="article:publisher"]', "content"),
                accessed: this.#createDateObject(new Date()),
                issued: this.#createDateObject(
                    new Date(
                        extractContent(doc, 'meta[name="date"]', "content") ||
                            extractContent(doc, 'meta[name="article:published_time"]', "content") ||
                            extractContent(doc, 'meta[property="article:published_time"]', "content") ||
                            extractContent(doc, 'meta[name="article:modified_time"]', "content") ||
                            extractContent(doc, 'meta[property="article:modified_time"]', "content") ||
                            extractContent(doc, 'meta[name="og:updated_time"]', "content") ||
                            extractContent(doc, 'meta[property="og:updated_time"]', "content") ||
                            extractContent(doc, ".publication-date", "")
                    )
                ),
                URL:
                    extractContent(doc, 'meta[property="og:url"]', "content") ||
                    extractContent(doc, 'meta[name="url"]', "content") ||
                    extractContent(doc, 'link[rel="canonical"]', "href") ||
                    url,
            };
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return { identifier: url, type: "URL", status: "failed" };
        }
    }

    async fromISBN(isbn) {
        try {
            const response = await fetch(
                `https://openlibrary.org/search.json?q=isbn:${isbn}&mode=everything&fields=*,editions`
            );

            const data = await response.json();
            const docs = data?.docs[0];
            const edition = docs?.editions?.docs[0];

            return {
                type: "book",
                title: docs?.title,
                "number-of-pages": docs?.number_of_pages_median,
                author: createAuthorsArray(docs?.author_name),
                publisher: edition?.publisher?.[0],
                "publisher-place": edition?.publish_place?.[0],
                ISBN: edition?.isbn?.[0] || isbn,
                issued: this.#createDateObject(new Date(edition?.publish_date?.[0])),
                accessed: this.#createDateObject(new Date()),
            };
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return { identifier: isbn, type: "ISBN", status: "failed" };
        }
    }

    async fromPMCID(pmcid) {
        const pmcIdWithoutPrefix = pmcid.replace(/^PMC/, "");

        try {
            const response = await fetch(
                `${this.#CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pmc/?format=csl&id=${pmcIdWithoutPrefix}`
            );

            const data = await response.json();

            return {
                DOI: data?.DOI,
                URL: data?.URL || data?.DOI ? `https://doi.org/${data.DOI}` : undefined,
                ISSN: data?.ISSN,
                PMID: data?.PMID,
                PMCID: data?.PMCID,
                "container-title": [data?.["container-title"]],
                issue: data?.issue,
                issued: data?.issued,
                page: data?.page,
                "publisher-place": data?.["publisher-place"],
                source: data?.source,
                title: data?.title,
                type: data?.type,
                volume: data?.volume,
                online: true,
                accessed: this.#createDateObject(new Date()),
                author: data?.author,
            };
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return { identifier: pmcid, type: "PMCID", status: "failed" };
        }
    }

    async fromPMID(pmid) {
        try {
            const response = await fetch(
                `${this.#CORS_PROXY}https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/?format=csl&id=${pmid}`
            );

            const data = await response.json();

            return {
                DOI: data?.DOI,
                URL: data?.URL || data?.DOI ? `https://doi.org/${data.DOI}` : undefined,
                ISSN: data?.ISSN,
                PMID: data?.PMID,
                PMCID: data?.PMCID,
                "container-title": [data?.["container-title"]],
                issue: data?.issue,
                issued: data?.issued,
                page: data?.page,
                "publisher-place": data?.["publisher-place"],
                source: data?.source,
                title: data?.title,
                type: data?.type,
                volume: data?.volume,
                online: true,
                accessed: this.#createDateObject(new Date()),
                author: data?.author,
            };
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return { identifier: pmid, type: "PMID", status: "failed" };
        }
    }

    async toBibliography(options) {
        const { style, locale } = options;
        try {
            const cslFile = await this.#getCslFile(style);
            const localeFile = await this.#getLocaleFile(locale);

            const config = plugins.config.get("@csl");
            config.templates.add(style, cslFile);
            config.locales.add(locale, localeFile);

            const cite = new Cite(this.cslJson);
            const formattedReferences = cite.format("bibliography", {
                template: style,
                lang: locale,
            });

            return formattedReferences;
        } catch (error) {
            if (this.options.logErrors) process.stderr.write(`\r${error.toString()}\n`);
            return null;
        }
    }
}

export default CSLJson;
