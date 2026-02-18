"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCommentsMd = formatCommentsMd;
function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    const date = dateStr.slice(0, 10);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${date} ${hours}:${minutes}`;
}
function formatCommentsMd(issueKey, summary, comments) {
    const contentComments = comments.filter((c) => c.content && c.content.trim());
    if (contentComments.length === 0)
        return null;
    const lines = [];
    lines.push(`# Comments: [${issueKey}] ${summary}`);
    lines.push("");
    contentComments.forEach((comment, i) => {
        if (i > 0) {
            lines.push("---");
            lines.push("");
        }
        lines.push(`## ${comment.createdUser.name} (${formatDateTime(comment.created)})`);
        lines.push("");
        lines.push(comment.content);
        lines.push("");
    });
    return lines.join("\n");
}
