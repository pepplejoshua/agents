import { FunctionDeclaration } from "@google/generative-ai";

export interface ToolExecutor {
  name: string;
  execute: (params: any) => Promise<any>;
}

export type ToolDefinition = FunctionDeclaration & {
  requiresPermission?: boolean;
};

export interface Message {
  role: "user" | "model";
  content: string;
}
