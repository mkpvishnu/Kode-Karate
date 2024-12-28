"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOVER_INFO = exports.KARATE_KEYWORDS = void 0;
exports.KARATE_KEYWORDS = [
    'Feature:', 'Scenario:', 'Given', 'When', 'Then', 'And', 'But',
    'Background:', 'call', 'callonce', 'def', 'print', 'assert',
    'path', 'url', 'method', 'status', 'match', 'contains'
];
exports.HOVER_INFO = {
    'Feature': 'Top level keyword that defines a test feature',
    'Scenario': 'Defines a test scenario within a feature',
    'Given': 'Sets up the initial test state',
    'When': 'Describes the action being tested',
    'Then': 'Describes the expected outcome',
    'And': 'Adds additional context to Given, When, or Then',
    'But': 'Adds negative context to Given, When, or Then',
    'Background': 'Defines steps that run before each scenario',
    'match': 'Asserts that a value matches the expected result',
    'contains': 'Checks if one value contains another',
    'print': 'Prints a value for debugging',
    'def': 'Defines a variable',
    'path': 'Sets the URL path',
    'url': 'Sets the base URL',
    'method': 'Sets the HTTP method (get, post, etc.)',
    'status': 'Asserts the HTTP response status code'
};
//# sourceMappingURL=index.js.map