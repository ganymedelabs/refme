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
    ERROR: `${FONT.BG_RED}${FONT.BOLD}${FONT.BLACK} ERROR ${FONT.RESET}`,
};

const HELP_MESSAGE = `
        Usage:

          refme <list of identifiers> [options]

        Description:

          refme is a CLI tool that generates formatted citations (references) based on various
          unique identifiers, including URL, DOI, ISBN, PMID, and PMCID.
        
        Commands:

          --style, -s <style>    Set the citation style (e.g., apa, modern-language-association, chicago-author-date)
          --locale, -l <locale>  Set the locale for the output (e.g., en-US, fr-FR, ar)
          --log-errors, -e       Enable logging of errors for debugging purposes
          --version, -v          Display the current version of refme
        
        Examples:

          refme identifier1 identifier2 identifier3 --style mla --locale en-GB
          refme id1 id2 -s chicago-author-date -e
          refme identifier --locale fr-FR

        Notes:

          - Identifiers are processed in the order provided.
          - Use "--log-errors" to output errors for troubleshooting.
          - You can check available citation styles and locales at:
            - Styles: https://github.com/citation-style-language/styles
            - Locales: https://github.com/citation-style-language/locales
        
`;

module.exports = { FONT, RESULT, HELP_MESSAGE };
