
import { GoogleGenAI, Type } from "@google/genai";
import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

export class GeminiService {
  // Simplified service using process.env.API_KEY exclusively as per guidelines.

  /**
   * Generates an image using gemini-2.5-flash-image (the default model for basic image tasks).
   */
  async generateImage(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: { imageConfig: { aspectRatio: "16:9" } }
    });

    // Iterate through all parts to find the image part as per guidelines.
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
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
    attachment?: AttachedFile,
    onStream?: (text: string) => void
  ): Promise<{ content: string; sources: Source[]; related: string[] }> {
    
    // Check if query is for image generation
    const isImageRequest = /draw|generate image|create an image|show me a picture/i.test(query);
    if (isImageRequest) {
      const imgUrl = await this.generateImage(query);
      return {
        content: `![Generated Image](${imgUrl})\n\nGenerated high-fidelity visual for your research context.`,
        sources: [],
        related: ["Download image", "Vary this image", "Describe details"]
      };
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    
    const sysPrompt = `You are a high-performance Research Engine (Model: ${model}). 
    Mode: ${focus}. Focus on synthesis and directness. 
    ${attachment ? `Context from uploaded file (${attachment.name}): ${attachment.content}` : ''}
    Always cite sources using [1], [2].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: [
        ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.content }] })),
        { role: 'user', parts: [{ text: query }] }
      ],
      config: {
        systemInstruction: sysPrompt,
        tools: [{ googleSearch: {} }]
      }
    });

    const content = response.text || "";
    // Extracting URLs from groundingChunks as per mandatory SDK requirements.
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: Source[] = grounding
      .filter((c: any) => c.web)
      .map((c: any) => ({ 
        title: c.web.title || hostname(c.web.uri), 
        uri: c.web.uri 
      }));

    return {
      content,
      sources,
      related: ["Detailed breakdown", "Practical examples", "Historical context"]
    };
  }
}

function hostname(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

export const gemini = new GeminiService();
