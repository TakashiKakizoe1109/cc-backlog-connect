export interface BacklogConfig {
  space: string;
  apiKey: string;
  projectKey: string;
}

export type ConfigKey = keyof BacklogConfig;
