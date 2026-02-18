import { BacklogComment } from "../api/types";

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const date = dateStr.slice(0, 10);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${date} ${hours}:${minutes}`;
}

export function formatCommentsMd(
  issueKey: string,
  summary: string,
  comments: BacklogComment[]
): string | null {
  const contentComments = comments.filter((c) => c.content && c.content.trim());
  if (contentComments.length === 0) return null;

  const lines: string[] = [];

  lines.push(`# Comments: [${issueKey}] ${summary}`);
  lines.push("");

  contentComments.forEach((comment, i) => {
    if (i > 0) {
      lines.push("---");
      lines.push("");
    }
    lines.push(`## ${comment.createdUser.name} (${formatDateTime(comment.created)})`);
    lines.push("");
    lines.push(comment.content!);
    lines.push("");
  });

  return lines.join("\n");
}
