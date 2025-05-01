import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { Tool, Message } from "./types";
import * as readline from "readline";

export class Agent {
  private genAi: GoogleGenerativeAI;
  private tools: Map<string, Tool>;
  private rl: readline.Interface;

  constructor(apiKey: string, tools: Tool[] = []) {
    this.genAi = new GoogleGenerativeAI(apiKey);
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
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
    const model = this.genAi.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Chat with Rho (use 'ctrl-c' to quit)");

    const chat = model.startChat({
      history: [],
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

    try {
      while (true) {
        const userInput = await this.getUserMessage();
        const modelResponseStream = await chat.sendMessageStream(userInput);

        process.stdout.write("\x1b[93m[ρ]\x1b[0m: ");
        for await (const chunk of modelResponseStream.stream) {
          const text = chunk.text();
          if (text) {
            process.stdout.write(text);
          }
        }
        // console.log("\n");
      }
    } finally {
      this.rl.close();
    }
  }
}
