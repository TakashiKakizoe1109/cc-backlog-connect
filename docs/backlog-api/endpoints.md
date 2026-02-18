# Backlog API Endpoint Catalog

Base URL: `https://{space}.backlog.com/api/v2`

Authentication: `apiKey` query parameter

Content-Type (mutations): `application/x-www-form-urlencoded`

Array parameters: `param[]=val1&param[]=val2`

---

## Tier 1: Issues CRUD

### GET /issues — Get Issue List
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId[] | Number | Optional | Project IDs |
| issueTypeId[] | Number | Optional | Issue Type IDs |
| statusId[] | Number | Optional | Status IDs |
| priorityId[] | Number | Optional | Priority IDs |
| assigneeId[] | Number | Optional | Assignee IDs |
| categoryId[] | Number | Optional | Category IDs |
| keyword | String | Optional | Full-text search |
| offset | Number | Optional | Pagination offset |
| count | Number | Optional | 1-100, default=20 |
| sort | String | Optional | created/updated/priority/status etc |
| order | String | Optional | asc/desc, default=desc |

Response: `BacklogIssue[]`

### GET /issues/count — Count Issues
Same filter params as Get Issue List.
Response: `{ count: number }`

### GET /issues/:issueIdOrKey — Get Issue
Response: `BacklogIssue`

### POST /issues — Add Issue
| Parameter | Type | Required |
|-----------|------|----------|
| projectId | Number | Required |
| summary | String | Required |
| issueTypeId | Number | Required |
| priorityId | Number | Required |
| description | String | Optional |
| assigneeId | Number | Optional |
| categoryId[] | Number | Optional |
| versionId[] | Number | Optional |
| milestoneId[] | Number | Optional |
| dueDate | String | Optional (yyyy-MM-dd) |
| estimatedHours | Number | Optional |
| actualHours | Number | Optional |
| parentIssueId | Number | Optional |
| notifiedUserId[] | Number | Optional |

Response: `201 Created` — `BacklogIssue`

### PATCH /issues/:issueIdOrKey — Update Issue
All params optional: summary, description, statusId, resolutionId, issueTypeId, priorityId, assigneeId, categoryId[], versionId[], milestoneId[], dueDate, estimatedHours, actualHours, comment

Response: `BacklogIssue`

### DELETE /issues/:issueIdOrKey — Delete Issue
Response: `BacklogIssue` (deleted object)

---

## Tier 2: Comments

### GET /issues/:issueIdOrKey/comments — Get Comments
| Parameter | Type | Required |
|-----------|------|----------|
| minId | Number | Optional |
| maxId | Number | Optional |
| count | Number | Optional (1-100, default=20) |
| order | String | Optional (asc/desc, default=desc) |

Response: `BacklogComment[]`

### POST /issues/:issueIdOrKey/comments — Add Comment
| Parameter | Type | Required |
|-----------|------|----------|
| content | String | Required |
| notifiedUserId[] | Number | Optional |

Response: `201 Created` — `BacklogComment`

### PATCH /issues/:issueIdOrKey/comments/:commentId — Update Comment
| Parameter | Type | Required |
|-----------|------|----------|
| content | String | Required |

Response: `BacklogComment`

### DELETE /issues/:issueIdOrKey/comments/:commentId — Delete Comment
Response: `BacklogComment` (deleted object)

---

## Tier 3: Project Metadata

### GET /priorities — Priority List
Response: `[{ id, name }]` — e.g. High(2), Normal(3), Low(4)

### GET /resolutions — Resolution List
Response: `[{ id, name }]` — e.g. Fixed(0), Won't Fix(1), Invalid(2), Duplication(3), Cannot Reproduce(4)

### GET /projects/:key/issueTypes — Issue Type List
Response: `[{ id, projectId, name, color, displayOrder }]`

### GET /projects/:key/statuses — Status List
Response: `[{ id, name }]`

### GET /projects/:key/categories — Category List
Response: `[{ id, projectId, name, displayOrder }]`

### GET /projects/:key/versions — Version/Milestone List
Response: `[{ id, projectId, name, description, startDate, releaseDueDate, archived, displayOrder }]`

### GET /projects/:key/users — Project User List
Response: `[{ id, userId, name, roleType, lang, mailAddress }]`

---

## Tier 4: Wiki

### GET /wikis — Wiki Page List
| Parameter | Type | Required |
|-----------|------|----------|
| projectIdOrKey | String | Required |
| keyword | String | Optional |

Response: `BacklogWikiPage[]` (content NOT included in list)

### GET /wikis/:wikiId — Get Wiki Page
Response: `BacklogWikiPage` (includes content)

### POST /wikis — Add Wiki Page
| Parameter | Type | Required |
|-----------|------|----------|
| projectId | Number | Required |
| name | String | Required |
| content | String | Required |
| mailNotify | Boolean | Optional |

Response: `201 Created` — `BacklogWikiPage`

### PATCH /wikis/:wikiId — Update Wiki Page
| Parameter | Type | Required |
|-----------|------|----------|
| name | String | Optional |
| content | String | Optional |
| mailNotify | Boolean | Optional |

Response: `BacklogWikiPage`

### DELETE /wikis/:wikiId — Delete Wiki Page
| Parameter | Type | Required |
|-----------|------|----------|
| mailNotify | Boolean | Optional |

Response: `BacklogWikiPage` (deleted object)

### GET /wikis/count — Count Wiki Pages
| Parameter | Type | Required |
|-----------|------|----------|
| projectIdOrKey | String | Required |

Response: `{ count: number }`
