"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = void 0;
const runScenario_1 = require("./runScenario");
const runTest_1 = require("./runTest");
function registerCommands(context, services) {
    (0, runScenario_1.registerRunScenarioCommand)(context, services);
    (0, runTest_1.registerRunTestCommand)(context, services);
}
exports.registerCommands = registerCommands;
//# sourceMappingURL=index.js.map