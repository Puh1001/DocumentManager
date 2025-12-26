import { MongoAbility } from "@casl/ability";

export type Actions =
  | "view"
  | "download"
  | "print"
  | "edit"
  | "create"
  | "delete"
  | "manage";

export interface Document {
  id: string;
  folderId?: string;
}

export interface Folder {
  id: string;
}

export interface User {
  id: string;
}

export interface Department {
  id: string;
}

export interface Kpi {
  id: string;
}

export interface Maintenance {
  id: string;
}

export interface Permission {
  id: string;
}

export type Subjects =
  | Document
  | Folder
  | User
  | Department
  | Kpi
  | Maintenance
  | Permission
  | "Document"
  | "Folder"
  | "User"
  | "Department"
  | "Kpi"
  | "Maintenance"
  | "Permission"
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;
