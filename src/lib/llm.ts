const spark = (window as any).spark ?? {};

export const llm: (prompt: string) => Promise<string> = spark.llm ?? (() => Promise.resolve(""));

export const llmPrompt: (strings: TemplateStringsArray, ...values: unknown[]) => string =
  spark.llmPrompt ?? (() => "");
