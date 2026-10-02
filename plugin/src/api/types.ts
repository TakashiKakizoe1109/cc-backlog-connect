export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
}

export interface BacklogUser {
  id: number;
  name: string;
  userId: string | null;
}

export interface BacklogStatus {
  id: number;
  name: string;
}

export interface BacklogPriority {
  id: number;
  name: string;
}

export interface BacklogIssueType {
  id: number;
  name: string;
}

export interface BacklogCustomFieldItem {
  id: number;
  name: string;
  displayOrder?: number;
}

/** Project definitions use typeId; issue values use fieldTypeId. */
export interface BacklogCustomField {
  id: number;
  projectId?: number;
  typeId: number; // 1 text, 2 sentence, 3 number, 4 date, 5 single, 6 multiple, 7 checkbox, 8 radio
  name: string;
  description: string;
  required: boolean;
  applicableIssueTypes: number[];
  min?: number | string | null;
  max?: number | string | null;
  initialValue?: number | null;
  initialDate?: { id: number; shift?: number; date?: string } | null;
  unit?: string | null;
  items?: BacklogCustomFieldItem[];
  allowInput?: boolean;
  allowAddItem?: boolean;
}

export interface BacklogIssueCustomField {
  id: number;
  fieldTypeId: number;
  name: string;
  value: string | number | BacklogCustomFieldItem | BacklogCustomFieldItem[] | null;
  otherValue?: string | null;
}

export type CustomFieldValues = Record<string,
  string | number | number[] | { value?: number | number[]; otherValue: string }
>;
export type CustomFieldFilters = Record<string,
  string | number[] | { min?: number | string; max?: number | string }
>;

export interface BacklogIssue {
  projectId?: number;
  customFields?: BacklogIssueCustomField[];
  id: number;
  issueKey: string;
  summary: string;
  description: string | null;
  status: BacklogStatus;
  issueType: BacklogIssueType;
  priority: BacklogPriority;
  assignee: BacklogUser | null;
  createdUser: BacklogUser;
  created: string;
  updated: string;
  dueDate: string | null;
  estimatedHours: number | null;
  actualHours: number | null;
}

export interface BacklogComment {
  id: number;
  content: string | null;
  createdUser: BacklogUser;
  created: string;
  updated: string | null;
}

export interface BacklogAttachment {
  id: number;
  name: string;
  size: number;
}

export interface BacklogCategory {
  id: number;
  name: string;
  displayOrder: number;
}

export interface BacklogVersion {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  startDate: string | null;
  releaseDueDate: string | null;
  archived: boolean;
  displayOrder: number;
}

export interface BacklogResolution {
  id: number;
  name: string;
}

export interface BacklogTag {
  id: number;
  name: string;
}

export interface BacklogWikiPage {
  id: number;
  projectId: number;
  name: string;
  content: string;
  tags: BacklogTag[];
  attachments: BacklogAttachment[];
  createdUser: BacklogUser;
  created: string;
  updatedUser: BacklogUser;
  updated: string;
}

export interface BacklogApiError {
  message: string;
  code: number;
  moreInfo: string;
}

export interface BacklogRateLimitCategory {
  limit: number;
  remaining: number;
  reset: number; // unix timestamp (seconds)
}

export interface BacklogRateLimit {
  read: BacklogRateLimitCategory;
  update: BacklogRateLimitCategory;
  search: BacklogRateLimitCategory;
  icon: BacklogRateLimitCategory;
}

export interface BacklogDocument {
  id: string; // string型（Wiki の wikiId: number とは異なる）
  projectId: number;
  title: string;
  plain: string | null; // Markdown テキスト（削除時は null）
  statusId: number;
  emoji?: string;
  attachments: BacklogAttachment[];
  tags: BacklogTag[];
  createdUser?: BacklogUser;
  createdUserId?: number;
  created: string;
  updatedUser?: BacklogUser;
  updatedUserId?: number;
  updated: string;
}

export interface BacklogDocumentNode {
  id: string;
  name: string;
  emoji?: string;
  children: BacklogDocumentNode[];
}

export interface BacklogDocumentTree {
  projectId: number;
  activeTree: BacklogDocumentNode;
  trashTree: BacklogDocumentNode;
}

export interface AddIssueParams {
  customFields?: CustomFieldValues;
  projectId: number;
  summary: string;
  issueTypeId: number;
  priorityId: number;
  description?: string;
  assigneeId?: number;
  categoryId?: number[];
  versionId?: number[];
  milestoneId?: number[];
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  parentIssueId?: number;
}

export interface UpdateIssueParams {
  customFields?: CustomFieldValues;
  summary?: string;
  description?: string;
  statusId?: number;
  assigneeId?: number;
  priorityId?: number;
  issueTypeId?: number;
  categoryId?: number[];
  versionId?: number[];
  milestoneId?: number[];
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  resolutionId?: number;
  comment?: string;
}
