import { Source, SearchFocus, AttachedFile, ModelID } from "../types";

export class PerplexityService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private healthMap: Map<string, boolean> = new Map();

  setKeys(keys: string[]) {
    this.apiKeys = [...new Set(keys.filter(k => k.trim().length > 0))];
    this.currentKeyIndex = 0;
    this.healthMap.clear();
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
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  private getNextKey(): string | null {
    if (this.apiKeys.length === 0) return null;
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      if (this.healthMap.get(key) !== false) {
        this.currentKeyIndex = idx;
        return key;
      }
    }
    return this.apiKeys[0];
  }

  private rotateKey() {
    const key = this.apiKeys[this.currentKeyIndex];
    this.healthMap.set(key, false);
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
  }

  async searchAndRespond(
    query: string, 
    focus: SearchFocus, 
    model: ModelID = 'sonar-pro',
    history: { role: string; content: string }[] = [],
    attachment?: AttachedFile
  ): Promise<{ content: string; sources: Source[]; related: string[] }> {
    
    let attempts = 0;
    const maxAttempts = Math.max(this.apiKeys.length, 1);

    while (attempts < maxAttempts) {
      const key = this.getNextKey();
      if (!key) throw new Error("No active API keys configured. Configure cluster nodes in settings.");

      try {
        const systemPrompt = `You are Bagewadi-Core, a world-class AI research and discovery engine. 
SEARCH FOCUS: ${focus}.
GOAL: Synthesize real-time information into a comprehensive, high-utility technical response.
DIRECTIVES:
- Use inline citations [1], [2] strictly corresponding to search data.
- Maintain a professional, objective, and analytical tone.
- Structure output with clear Markdown headers and bold emphasis on key technical terms.
${attachment ? `ATTACHMENT CONTEXT (${attachment.name}): ${attachment.content}` : ''}`;

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              { role: 'system', content: systemPrompt },
              ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
              { role: 'user', content: query }
            ],
            stream: false
          })
        });

        if (response.status === 401 || response.status === 429) {
          this.rotateKey();
          attempts++;
          continue;
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const citations = data.citations || [];
        
        const sources: Source[] = citations.map((url: string) => ({
          title: new URL(url).hostname.replace('www.', ''),
          uri: url
        }));

        const related = [
          "Explain technical architecture in more detail",
          "What are the latest industry trends?",
          "Show comparison with historical data"
        ];

        return { content, sources, related };
      } catch (e) {
        this.rotateKey();
        attempts++;
      }
    }
    throw new Error("Critical Failure: All API nodes exhausted or unreachable.");
  }
}

export const perplexity = new PerplexityService();