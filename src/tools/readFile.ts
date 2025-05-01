import { promises as fs } from "fs";
import { FunctionDeclaration, SchemaType } from "@google/generative-ai";
import { ToolExecutor } from "../types";

interface ReadFileParams {
  path: string;
}

export const readFileDefinition: FunctionDeclaration = {
  name: "read_file",
  description: "Read the contents of a file at the given path",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: {
        type: SchemaType.STRING,
        description:
          "The relative path of the file to read (e.g., 'src/main.ts')",
      },
    },
    required: ["path"],
  },
};

// The implementation that actually executes
export const readFileExecutor: ToolExecutor = {
  name: "read_file",
  async execute(params: ReadFileParams): Promise<any> {
    try {
      const content = await fs.readFile(params.path, "utf-8");
      return { content };
    } catch (error) {
      if (error instanceof Error) {
        return { error: `Error reading file: ${error.message}` };
      }
      return { error: "Unknown error occurred while reading file" };
    }
  },
};
