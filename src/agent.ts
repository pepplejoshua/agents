import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  FunctionDeclaration,
} from "@google/generative-ai";
import { ToolExecutor, ToolDefinition } from "./types";
import * as readline from "readline";

// ANSI color codes for terminal styling
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  // Foreground colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
};

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
      this.rl.question(
        `${colors.blue}${colors.bright}You${colors.reset}: `,
        (answer) => {
          resolve(answer);
        },
      );
    });
  }

  private showLogo() {
    const logoText = `
    ${colors.cyan}${colors.bright}╔════════════════════════╗
    ║                        ║
    ║  ${colors.magenta}ρ${colors.cyan}  Terminal AI Agent ${colors.dim}${colors.bright} ║
    ║                        ║
    ╚════════════════════════╝${colors.reset}
    `;
    console.log(logoText);
    console.log(
      `    ${colors.dim}Type your questions or requests about this codebase.${colors.reset}`,
    );
    console.log(
      `    ${colors.dim}Use ${colors.bright}ctrl+c${colors.reset}${colors.dim} to exit.${colors.reset}`,
    );
    console.log();
  }

  private timestamp(): string {
    const now = new Date();
    return (
      colors.dim +
      `[${now.getHours().toString().padStart(2, "0")}:${now
        .getMinutes()
        .toString()
        .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}] ` +
      colors.reset
    );
  }

  private formatToolCall(name: string, args: any): string {
    return `${colors.green}${colors.bright}🔧 TOOL${colors.reset} ${colors.white}${colors.bgGreen}${colors.bright} ${name} ${colors.reset}(${JSON.stringify(args, null, 2)})`;
  }

  private formatModelResponse(text: string): string {
    return `${colors.yellow}${colors.bright}ρ${colors.reset}: ${text}`;
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
    const rhoSysPrompt = `You are a code-focused AI assistant called Rho (ρ) running in the terminal.
    PRIMARY PURPOSE: You help users understand and modify codebases.

    IMPORTANT INSTRUCTIONS:
    1. Be concise and direct - users are in a terminal context.
    2. Proactively use your tools to explore the codebase when asked about code.
    3. When asked about this project, IMMEDIATELY use list_files and read_file tools to explore it.
    4. When asked to make changes, confidently use the edit_file tool.
    5. When asked to create new files, use edit_file with empty old_str.
    6. Use Markdown only when explicitly requested.
    7. For basic greetings or non-code questions, don't use tools.
    8. Your job is code assistance - focus on that.

    You have these tools:
    ${this.toolDefinitions
      .map((tool) => `- ${tool.name}: ${tool.description?.split("\n")[0]}`)
      .join("\n    ")}`;

    this.showLogo();

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

        // Send user message
        let response = await chat.sendMessage(userInput);

        // Process the response potentially multiple times if it contains function calls
        while (true) {
          // Display current response text
          const responseText = response.response.text();
          console.log(this.formatModelResponse(responseText));

          // Check for function calls
          const functionCalls = response.response.functionCalls();

          // If no function calls, we're done with this turn
          if (!functionCalls || functionCalls.length === 0) {
            break;
          }

          console.log(
            `${colors.cyan}${colors.bright}⚡ ${functionCalls.length} ${functionCalls.length === 1 ? "tool" : "tools"} requested${colors.reset}`,
          );

          // Need to provide responses for ALL function calls in this turn
          const functionResponses = [];

          // Process all function calls in this turn
          for (const functionCall of functionCalls) {
            console.log(
              this.formatToolCall(functionCall.name, functionCall.args),
            );

            // Execute the tool
            const executor = this.toolExecutors.get(functionCall.name);
            let toolResult;

            if (executor) {
              try {
                toolResult = await executor(functionCall.args);
              } catch (error) {
                toolResult = {
                  error: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
                };
              }
            } else {
              toolResult = { error: `Tool not found: ${functionCall.name}` };
            }

            // Add to the list of responses
            functionResponses.push({
              functionResponse: {
                name: functionCall.name,
                response: toolResult,
              },
            });
          }

          // Send ALL function responses together
          response = await chat.sendMessage(functionResponses);
        }
      }
    } finally {
      this.rl.close();
    }
  }
}
