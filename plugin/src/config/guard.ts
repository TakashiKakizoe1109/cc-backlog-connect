import { BacklogConfig } from "./types";

export function assertWriteMode(config: BacklogConfig): void {
  if ((config.mode ?? "read") !== "write") {
    console.error("Error: This operation requires write mode.");
    console.error('Run "cc-backlog config set --mode write" to enable writes.');
    process.exit(1);
  }
}
