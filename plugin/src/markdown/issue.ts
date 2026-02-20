import { BacklogIssue, BacklogAttachment } from "../api/types";

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function isImageAttachment(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
}

export function formatIssueMd(issue: BacklogIssue, space: string, attachments?: BacklogAttachment[]): string {
  const lines: string[] = [];

  lines.push(`# [${issue.issueKey}] ${issue.summary}`);
  lines.push("");

  const url = `https://${space}.backlog.com/view/${issue.issueKey}`;
  lines.push(`- **URL**: ${url}`);
  lines.push(`- **Status**: ${issue.status.name}`);
  lines.push(`- **Type**: ${issue.issueType.name}`);
  lines.push(`- **Priority**: ${issue.priority.name}`);

  if (issue.assignee) {
    lines.push(`- **Assignee**: ${issue.assignee.name}`);
  }
  lines.push(`- **Reporter**: ${issue.createdUser.name}`);
  lines.push(`- **Created**: ${formatDate(issue.created)}`);
  lines.push(`- **Updated**: ${formatDate(issue.updated)}`);

  if (issue.dueDate) {
    lines.push(`- **Due Date**: ${formatDate(issue.dueDate)}`);
  }
  if (issue.estimatedHours != null) {
    lines.push(`- **Estimated Hours**: ${issue.estimatedHours}`);
  }
  if (issue.actualHours != null) {
    lines.push(`- **Actual Hours**: ${issue.actualHours}`);
  }

  lines.push("");
  lines.push("## Description");
  lines.push("");
  lines.push(issue.description ?? "(No description)");
  lines.push("");

  if (attachments && attachments.length > 0) {
    lines.push("## Attachments");
    lines.push("");
    for (const att of attachments) {
      if (isImageAttachment(att.name)) {
        lines.push(`![${att.name}](attachments/${att.name})`);
      } else {
        lines.push(`- [${att.name}](attachments/${att.name})`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
