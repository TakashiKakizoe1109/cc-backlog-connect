export interface BacklogConfig {
  space: string;
  apiKey: string;
  projectKey: string;
  mode?: "read" | "write";
}

export type ConfigKey = keyof BacklogConfig;
