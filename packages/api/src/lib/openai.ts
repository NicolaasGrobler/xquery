import { OpenAI } from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn(
    "OPENAI_API_KEY not set. OpenAI features will not be available."
  );
}

export const openai = new OpenAI({
  apiKey: apiKey || "",
});

export const ASSISTANT_MODEL = "gpt-4o-mini";

export const ASSISTANT_INSTRUCTIONS = `You are a helpful assistant that answers questions about documents.
When the user asks a question, search through the attached file(s) to find relevant information.
Provide clear, accurate answers based on the document content.
If the information is not found in the documents, say so clearly.`;

let cachedAssistantId: string | null = null;

export async function getOrCreateAssistant(): Promise<string> {
  if (cachedAssistantId) {
    return cachedAssistantId;
  }

  const existingAssistantId = process.env.OPENAI_ASSISTANT_ID;
  if (existingAssistantId) {
    cachedAssistantId = existingAssistantId;
    return existingAssistantId;
  }

  const assistant = await openai.beta.assistants.create({
    name: "Document Assistant",
    instructions: ASSISTANT_INSTRUCTIONS,
    model: ASSISTANT_MODEL,
    tools: [{ type: "file_search" }],
  });

  cachedAssistantId = assistant.id;
  console.log(`Created new assistant: ${assistant.id}`);
  console.log("Set OPENAI_ASSISTANT_ID env var to reuse this assistant.");

  return assistant.id;
}
