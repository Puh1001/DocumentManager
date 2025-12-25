import { MongoAbility, RawRuleOf } from "@casl/ability";

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

export interface Maintenance {
  id: string;
}

export type Subjects =
  | Document
  | Folder
  | User
  | Maintenance
  | "Document"
  | "Folder"
  | "User"
  | "Maintenance"
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export type RawRule = RawRuleOf<AppAbility>;
