export interface Tool {
  name: string;
  description: string;
  execute: (params: any) => Promise<string>;
}

export interface Message {
  role: "user" | "model";
  content: string;
}
