import OpenAI from "openai";

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
