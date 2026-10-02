import { BacklogIssue, BacklogAttachment, BacklogIssueCustomField } from "../api/types";

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function isImageAttachment(filename: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filename);
}

function customFieldValue(field: BacklogIssueCustomField): string {
  const value = field.value;
  let text: string;
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) text = "";
  else if (Array.isArray(value)) text = value.map(item => item.name).join(", ");
  else if (typeof value === "object") text = value.name;
  else if (field.fieldTypeId === 4 && typeof value === "string") text = formatDate(value);
  else text = String(value);
  if (field.otherValue) text = [text, `Other: ${field.otherValue}`].filter(Boolean).join("; ");
  return (text || "(Not set)").replace(/\r?\n/g, "\n  ");
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
  if (issue.customFields?.length) {
    lines.push("## Custom Fields");
    lines.push("");
    for (const field of issue.customFields) {
      const name = field.name.replace(/[\r\n]/g, " ").replace(/([\\*_[\]])/g, "\\$1");
      lines.push(`- **${name}** (${field.id}): ${customFieldValue(field)}`);
    }
    lines.push("");
  }
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
