import { loadConfig } from "../config/loader";
import { BacklogApiClient, BacklogClientError } from "../api/client";

type InfoType = "statuses" | "issue-types" | "priorities" | "resolutions" | "users" | "categories" | "versions";

const VALID_TYPES: InfoType[] = ["statuses", "issue-types", "priorities", "resolutions", "users", "categories", "versions"];

export async function projectInfoCommand(args: string[]): Promise<void> {
  const infoType = args[0] as InfoType | undefined;

  if (!infoType || !VALID_TYPES.includes(infoType)) {
    console.error(`Usage: cc-backlog project-info <type>`);
    console.error(`Types: ${VALID_TYPES.join(", ")}`);
    process.exit(1);
  }

  const config = loadConfig();
  if (!config) {
    console.error('Error: No configuration found. Run "cc-backlog config set" first.');
    process.exit(1);
  }

  const client = new BacklogApiClient(config);

  try {
    let data: unknown;

    switch (infoType) {
      case "statuses":
        data = await client.getStatuses(config.projectKey);
        break;
      case "issue-types":
        data = await client.getIssueTypes(config.projectKey);
        break;
      case "priorities":
        data = await client.getPriorities();
        break;
      case "resolutions":
        data = await client.getResolutions();
        break;
      case "users":
        data = await client.getProjectUsers(config.projectKey);
        break;
      case "categories":
        data = await client.getCategories(config.projectKey);
        break;
      case "versions":
        data = await client.getVersions(config.projectKey);
        break;
    }

    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    if (err instanceof BacklogClientError) {
      console.error(`Error: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}
