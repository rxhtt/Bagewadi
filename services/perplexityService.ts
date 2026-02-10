
import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

export class PerplexityService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private healthMap: Map<string, { isValid: boolean; lastChecked: number }> = new Map();

  setKeys(keys: string[]) {
    this.apiKeys = [...new Set(keys.filter(k => k.trim().length > 0))];
    this.currentKeyIndex = 0;
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      });
      
      const isValid = response.status === 200;
      this.healthMap.set(key, { isValid, lastChecked: Date.now() });
      return isValid;
    } catch (e) {
      console.error("Validation error:", e);
      return false;
    }
  }

  private getNextKey(): string | null {
    if (this.apiKeys.length === 0) return null;

    // Try to find the next valid key in a circular manner
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      const health = this.healthMap.get(key);
      
      // If we haven't invalidated it or it was valid recently, use it
      if (!health || health.isValid) {
        this.currentKeyIndex = idx;
        return key;
      }
    }
    
    // If all failed, return the first one as fallback and try anyway
    return this.apiKeys[0];
  }

  async searchAndRespond(
    query: string, 
    focus: SearchFocus, 
    model: ModelID,
    history: { role: string; content: string }[] = [],
    attachment?: AttachedFile
  ): Promise<{ content: string; sources: Source[]; related: string[] }> {
    
    let retryCount = 0;
    const maxRetries = Math.min(this.apiKeys.length, 3);

    while (retryCount <= maxRetries) {
      const key = this.getNextKey();
      if (!key) throw new Error("No API keys configured. Please add Perplexity keys in Settings.");

      try {
        const systemPrompt = `You are an expert research engine. Focus: ${focus}. 
        Provide hyper-accurate synthesized answers with inline citations.
        ${attachment ? `Additional context from file ${attachment.name}: ${attachment.content}` : ''}`;

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar-pro', // Using sonar-pro for high quality research
            messages: [
              { role: 'system', content: systemPrompt },
              ...history,
              { role: 'user', content: query }
            ],
            stream: false
          })
        });

        if (response.status === 401 || response.status === 403) {
          this.healthMap.set(key, { isValid: false, lastChecked: Date.now() });
          retryCount++;
          continue;
        }

        if (response.status === 429) {
          // Rate limited, rotate and try again
          this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
          retryCount++;
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const citations = data.citations || [];
        
        const sources: Source[] = citations.map((url: string, i: number) => ({
          title: new URL(url).hostname.replace('www.', ''),
          uri: url
        }));

        // Mocking related questions as Perplexity's basic API doesn't always return them in a standard field
        const related = [
          "Explain the technical details further",
          "What are the long-term implications?",
          "Show me recent developments related to this"
        ];

        return { content, sources, related };

      } catch (e) {
        console.error("API Error:", e);
        retryCount++;
      }
    }

    throw new Error("Failed to get response after multiple retries. Check your API keys.");
  }
}

export const perplexity = new PerplexityService();
