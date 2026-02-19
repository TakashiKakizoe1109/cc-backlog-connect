export interface BacklogConfig {
  space: string;
  apiKey: string;
  projectKey: string;
  mode?: "read" | "write";
  parallel?: number;
}

export type ConfigKey = keyof BacklogConfig;
