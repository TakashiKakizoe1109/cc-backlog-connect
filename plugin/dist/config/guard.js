"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertWriteMode = assertWriteMode;
function assertWriteMode(config) {
    if ((config.mode ?? "read") !== "write") {
        console.error("Error: This operation requires write mode.");
        console.error('Run "cc-backlog config set --mode write" to enable writes.');
        process.exit(1);
    }
}
