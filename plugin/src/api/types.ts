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

export interface BacklogIssue {
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

export interface AddIssueParams {
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
