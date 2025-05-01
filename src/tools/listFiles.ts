import { promises as fs } from "fs";
import * as path from "path";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { ToolExecutor } from "../types";

interface ListFilesParams {
  path?: string;
}

export const listFilesDefinition: FunctionDeclaration = {
  name: "list_files",
  description:
    "List files and directories at the given path. If no path is provided, lists files in the current directory.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description:
          "Optional relative path to list files from. Defaults to current directory if not provided.",
      },
    },
    required: [],
  },
};

export const listFilesExecutor: ToolExecutor = {
  name: "list_files",
  async execute(params: ListFilesParams): Promise<any> {
    try {
      const dirPath = params.path || ".";
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      const files = entries.map((entry) => {
        const isDir = entry.isDirectory();
        return {
          name: entry.name + (isDir ? "/" : ""),
          type: isDir ? "directory" : "file",
          path: path.join(dirPath, entry.name),
        };
      });

      return { files };
    } catch (error) {
      if (error instanceof Error) {
        return { error: `Error listing files: ${error.message}` };
      }
      return { error: "Unknown error occurred while listing files" };
    }
  },
};
