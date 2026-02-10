import { GoogleGenAI, Type } from "@google/genai";
import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

export class GeminiService {
  /**
   * Helper to always get a fresh AI instance with the current API key
   */
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Generates an image using gemini-2.5-flash-image
   */
  async generateImage(prompt: string): Promise<string> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("Image generation failed");
  }

  /**
   * Fetches trending global news using gemini-3-flash-preview with JSON schema.
   */
  async getDiscoverTrends(): Promise<{ title: string; description: string }[]> {
    const ai = this.getClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'Fetch 4 trending global research or tech news. Return as JSON array of {title, description}.',
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        }
      });
      return JSON.parse(response.text || "[]");
    } catch {
      return [];
    }
  }

  /**
   * Executes research search queries using gemini-3-pro-preview with Google Search grounding.
   */
  async searchAndRespond(
    query: string, 
    focus: SearchFocus, 
    model: ModelID,
    history: { role: string; content: string }[] = [],
    attachment?: AttachedFile
  ): Promise<{ content: string; sources: Source[]; related: string[] }> {
    
    const isImageRequest = /draw|generate image|create an image|show me a picture/i.test(query);
    if (isImageRequest) {
      const imgUrl = await this.generateImage(query);
      return {
        content: `![Generated Image](${imgUrl})\n\nGenerated high-fidelity visual for your research context.`,
        sources: [],
        related: ["Download image", "Vary this image", "Describe details"]
      };
    }

    const ai = this.getClient();
    
    const masterPrompt = `You are a world-class Research and Discovery Engine, modeled after the highest performance intelligence systems.
    Current Search Focus: ${focus}.
    
    OPERATIONAL DIRECTIVES:
    1. SYNTHESIS: Provide comprehensive, accurate, and direct answers. Avoid conversational filler.
    2. CITATION: Use inline citations like [1], [2] corresponding to the provided search results.
    3. STRUCTURE: Use markdown headers, bold text for key terms, and lists for complex data.
    4. ACCURACY: If information is unavailable or contradictory, state it clearly.
    5. CONTEXT: ${attachment ? `Incorporate the following user-provided data into your analysis: "${attachment.content}"` : 'No additional attachments provided.'}

    Always respond as a precise, high-utility research tool.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: masterPrompt,
        tools: [{ googleSearch: {} }]
      }
    });

    const content = response.text || "I was unable to synthesize a response. Please try refining your query.";
    
    // Extract grounding sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Source[] = groundingChunks
      .filter((c: any) => c.web)
      .map((c: any) => ({ 
        title: c.web.title || hostname(c.web.uri), 
        uri: c.web.uri 
      }));

    return {
      content,
      sources: sources.slice(0, 5), // Keep the top 5 most relevant sources
      related: [
        "Provide more technical depth",
        "Show alternative perspectives",
        "Recent updates on this topic"
      ]
    };
  }
}

function hostname(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

export const gemini = new GeminiService();