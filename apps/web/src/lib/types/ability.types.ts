import { MongoAbility } from "@casl/ability";

export type Actions =
  | "view"
  | "download"
  | "print"
  | "copy"
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

export interface Module {
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
  | Module
  | "Document"
  | "Folder"
  | "User"
  | "Department"
  | "Kpi"
  | "Maintenance"
  | "Permission"
  | "Module"
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;
