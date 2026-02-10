
import { GoogleGenAI, Type } from "@google/genai";
import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

// Safety check for process.env in browser environments to prevent white-screen crashes
const getApiKey = () => {
  try {
    return (process.env.API_KEY as string) || '';
  } catch (e) {
    console.warn("process.env.API_KEY not found in global scope");
    return '';
  }
};

export class GeminiService {
  /**
   * Generates an image using gemini-2.5-flash-image
   */
  async generateImage(prompt: string): Promise<string> {
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
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
    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
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
    
    const isImageRequest = /draw|generate image|create an image|show me a picture/i.test(query);
    if (isImageRequest) {
      const imgUrl = await this.generateImage(query);
      return {
        content: `![Generated Image](${imgUrl})\n\nGenerated high-fidelity visual for your research context.`,
        sources: [],
        related: ["Download image", "Vary this image", "Describe details"]
      };
    }

    const apiKey = getApiKey();
    const ai = new GoogleGenAI({ apiKey });
    
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
