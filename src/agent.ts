// src/agent.ts
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  FunctionDeclaration,
} from "@google/generative-ai";
import { ToolExecutor, ToolDefinition } from "./types";
import * as readline from "readline";

export class Agent {
  private genAi: GoogleGenerativeAI;
  private toolExecutors: Map<string, ToolExecutor["execute"]>;
  private toolDefinitions: ToolDefinition[];
  private rl: readline.Interface;

  constructor(
    apiKey: string,
    tools: { definition: ToolDefinition; executor: ToolExecutor }[] = [],
  ) {
    this.genAi = new GoogleGenerativeAI(apiKey);
    this.toolExecutors = new Map(
      tools.map((tool) => [tool.executor.name, tool.executor.execute]),
    );
    this.toolDefinitions = tools.map((tool) => tool.definition);
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private getUserMessage(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question("\x1b[94mYou\x1b[0m: ", (answer) => {
        resolve(answer);
      });
    });
  }

  async run() {
    // Create model with tools
    const model = this.genAi.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ functionDeclarations: this.toolDefinitions }],
      generationConfig: {
        maxOutputTokens: 1000,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    // Simple system prompt
    const rhoSysPrompt = `You are a helpful Ai assistant called Rho (ρ).
    You are running in the terminal through a NodeJS (TS) CLI application.
    Keep response concise. Ask questions of the user if needed.
    You have access to tools to help you. Use them when needed.
    Since you are running in the terminal, do not use Markdown unless specifically requested.`;

    console.log("Chat with Rho (use 'ctrl-c' to quit)");

    const chat = model.startChat({
      history: [],
      systemInstruction: {
        role: "system",
        parts: [{ text: rhoSysPrompt }],
      },
    });

    try {
      while (true) {
        const userInput = await this.getUserMessage();
        let result = await chat.sendMessage(userInput);

        // Process function calls if any
        while (true) {
          const response = result.response;
          const functionCalls = response.functionCalls();

          if (functionCalls && functionCalls.length > 0) {
            // Handle function call
            const functionCall = functionCalls[0]; // Process one at a time
            console.log(
              `\x1b[92mtool\x1b[0m: ${functionCall.name}(${JSON.stringify(functionCall.args)})`,
            );

            const executor = this.toolExecutors.get(functionCall.name);
            let toolResult;

            if (executor) {
              try {
                toolResult = await executor(functionCall.args);
              } catch (error) {
                toolResult = { error: `Execution error: ${error}` };
              }
            } else {
              toolResult = { error: `Tool not found: ${functionCall.name}` };
            }

            // Send tool result back to the model
            result = await chat.sendMessage([
              {
                functionResponse: {
                  name: functionCall.name,
                  response: toolResult,
                },
              },
            ]);
          } else {
            // No function calls, print the model's response
            process.stdout.write("\x1b[93m[ρ]\x1b[0m: ");
            process.stdout.write(response.text());
            break; // Exit the inner loop
          }
        }
      }
    } finally {
      this.rl.close();
    }
  }
}
