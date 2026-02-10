import { GoogleGenAI, Type } from "@google/genai";
import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

export class GeminiService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private healthMap: Map<string, boolean> = new Map();

  /**
   * Updates the key pool for rotation.
   */
  setKeys(keys: string[]) {
    this.apiKeys = keys.filter(k => k.trim().length > 0);
    this.currentKeyIndex = 0;
    this.healthMap.clear();
  }

  /**
   * Validates a Gemini API key by performing a lightweight call.
   */
  async validateKey(key: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 1 }
      });
      this.healthMap.set(key, true);
      return true;
    } catch (e) {
      console.error("Key validation failed", e);
      this.healthMap.set(key, false);
      return false;
    }
  }

  /**
   * Gets a client with the current key or the env default.
   */
  private getClient() {
    let key = process.env.API_KEY || '';
    
    if (this.apiKeys.length > 0) {
      // Find the next healthy key
      for (let i = 0; i < this.apiKeys.length; i++) {
        const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
        const candidate = this.apiKeys[idx];
        if (this.healthMap.get(candidate) !== false) {
          key = candidate;
          this.currentKeyIndex = idx;
          break;
        }
      }
    }
    
    return new GoogleGenAI({ apiKey: key });
  }

  /**
   * Rotates to the next key in the pool.
   */
  private rotateKey() {
    if (this.apiKeys.length > 1) {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      console.log(`Rotating to API key index: ${this.currentKeyIndex}`);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let attempts = 0;
    const maxAttempts = Math.max(this.apiKeys.length, 1, 3);

    while (attempts < maxAttempts) {
      try {
        return await fn();
      } catch (error: any) {
        attempts++;
        const status = error.status || (error.message?.includes('429') ? 429 : error.message?.includes('401') ? 401 : null);
        
        if (attempts < maxAttempts && (status === 429 || status === 401)) {
          if (this.apiKeys.length > 0) {
            this.healthMap.set(this.apiKeys[this.currentKeyIndex], false);
            this.rotateKey();
            continue;
          }
        }
        throw error;
      }
    }
    throw new Error("All API nodes exhausted.");
  }

  async generateImage(prompt: string): Promise<string> {
    return this.withRetry(async () => {
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
    });
  }

  async getDiscoverTrends(): Promise<{ title: string; description: string }[]> {
    return this.withRetry(async () => {
      const ai = this.getClient();
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
    });
  }

  async searchAndRespond(
    query: string, 
    focus: SearchFocus, 
    model: ModelID,
    history: { role: string; content: string }[] = [],
    attachment?: AttachedFile
  ): Promise<{ content: string; sources: Source[]; related: string[] }> {
    
    const isImageRequest = focus === SearchFocus.CANVAS || /draw|generate image|create an image|show me a picture/i.test(query);
    if (isImageRequest) {
      const imgUrl = await this.generateImage(query);
      return {
        content: `![Generated Image](${imgUrl})\n\nGenerated high-fidelity visual for your research context.`,
        sources: [],
        related: ["Download image", "Vary this image", "Describe details"]
      };
    }

    return this.withRetry(async () => {
      const ai = this.getClient();
      const masterPrompt = `You are a world-class Research and Discovery Engine.
      Current Search Focus: ${focus}.
      DIRECTIVES: Direct synthesis, inline citations like [1], [2], markdown structure.
      ${attachment ? `Incorporate user-provided context: "${attachment.content}"` : ''}`;

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

      const content = response.text || "No response synthesized.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources: Source[] = chunks
        .filter((c: any) => c.web)
        .map((c: any) => ({ title: c.web.title || "Source", uri: c.web.uri }));

      return {
        content,
        sources: sources.slice(0, 5),
        related: [
          "Explain this in more depth",
          "What are the counter-arguments?",
          "Show recent news about this"
        ]
      };
    });
  }
}

export const gemini = new GeminiService();