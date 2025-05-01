import { Agent } from "./agent";
import * as dotenv from "dotenv";
import { readFileDefinition, readFileExecutor } from "./tools/readFile";

dotenv.config();

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
  console.error("Please set GOOGLE_API_KEY environment variable");
  process.exit(1);
}

const agent = new Agent(apiKey, [
  { definition: readFileDefinition, executor: readFileExecutor },
]);

agent.run().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
