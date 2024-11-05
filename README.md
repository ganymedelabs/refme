# refme

`refme` is a CLI tool that generates formatted citations (references) based on various unique identifiers, including URL, DOI, ISBN, PMID, and PMCID. Just pass in your identifiers, and `refme` will handle the rest!

## 📋 Table of Contents

-   [Installation](#-installation)
-   [Usage](#-usage)
    -   [Options](#-options)
    -   [Examples](#-examples)
    -   [Specifying Identifier Types](#-specifying-identifier-types)
-   [Supported Identifiers](#-supported-identifiers)
-   [Output](#-output)
-   [License](#-license)
-   [Contact](#-contact)

## ⚙️ Installation

Install `refme` globally via npm:

```bash
npm install -g refme
```

Or use it directly with `npx` without global installation:

```bash
npx refme <list of identifiers>
```

## 🚀 Usage

To generate citations, provide a list of unique identifiers as arguments. `refme` will attempt to identify the type of each identifier automatically.

### Options

-   `--style`, `-s <style>`: Choose the citation style for the output (e.g., `apa`, `modern-language-association`, `chicago-author-date`). The default is APA.
-   `--locale`, `-l <locale>`: Set the locale for the citation language (e.g., `en-US` for U.S. English, `fr-FR` for French, `ar` for Arabic). The default is `en-US`.

> **Note:** You can check available citation styles and locales at:
>
> -   Styles: [https://github.com/citation-style-language/styles](https://github.com/citation-style-language/styles)
> -   Locales: [https://github.com/citation-style-language/locales](https://github.com/citation-style-language/locales)

### Examples

```bash
# Using globally installed package
refme 10.1000/xyz123 978-3-16-148410-0

# Specifying a citation style and locale
refme --style mla --locale en-GB 10.1000/xyz123
```

Or with `npx`:

```bash
npx refme --style chicago --locale fr-FR https://example.com/article
```

### Specifying Identifier Types

If `refme` misinterprets an identifier’s type or if you want to force a specific type, you can prefix it with the type and a colon, like so:

```bash
refme "url: https://doi.org/10.xyz123" "isbn: 978-3-16-148410-0"
```

This will force `refme` to treat the first identifier as a URL and the second as an ISBN. This works for all identifier types: **url**, **doi**, **isbn**, **pmid**, and **pmcid**.

## 🆔 Supported Identifiers

-   **DOI**: e.g., `10.1093/ajae/aaq063`
-   **URL**: e.g., `https://example.com`
-   **ISBN**: e.g., `978-3-16-148410-0`
-   **PMID**: e.g., `27097605`
-   **PMCID**: e.g., `PMC6323133`

## 📄 Output

`refme` generates a formatted citation (reference) for each identifier. The output is styled for easy copy-pasting into documents and includes all relevant citation details, formatted according to standard citation styles and locale settings.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📧 Contact

For inquiries or more information, you can reach out to us at [ganymedelabs@gmail.com](mailto:ganymedelabs@gmail.com).
