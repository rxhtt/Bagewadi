
import { ImageProvider } from "../types";

export class ImageService {
  private keyPool: Record<ImageProvider, string[]> = {
    openai: [],
    stability: [],
    replicate: []
  };
  
  private currentIndices: Record<ImageProvider, number> = {
    openai: 0,
    stability: 0,
    replicate: 0
  };

  private healthMap: Map<string, boolean> = new Map();

  setKeys(provider: ImageProvider, keys: string[]) {
    this.keyPool[provider] = [...new Set(keys.filter(k => k.trim().length > 0))];
    this.currentIndices[provider] = 0;
  }

  async validateKey(provider: ImageProvider, key: string): Promise<boolean> {
    try {
      if (provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        return res.status === 200;
      }
      if (provider === 'stability') {
        const res = await fetch('https://api.stability.ai/v1/user/account', {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        return res.status === 200;
      }
      if (provider === 'replicate') {
        const res = await fetch('https://api.replicate.com/v1/collections', {
          headers: { 'Authorization': `Token ${key}` }
        });
        return res.status === 200;
      }
      return false;
    } catch {
      return false;
    }
  }

  private getNextKey(provider: ImageProvider): string | null {
    const keys = this.keyPool[provider];
    if (keys.length === 0) return null;

    for (let i = 0; i < keys.length; i++) {
      const idx = (this.currentIndices[provider] + i) % keys.length;
      const key = keys[idx];
      if (this.healthMap.get(key) !== false) {
        this.currentIndices[provider] = idx;
        return key;
      }
    }
    return keys[0];
  }

  async generateImage(prompt: string, provider: ImageProvider, modelId?: string): Promise<string> {
    let retryCount = 0;
    const keys = this.keyPool[provider];
    const maxRetries = Math.max(keys.length, 1);

    while (retryCount < maxRetries) {
      const key = this.getNextKey(provider);
      if (!key) throw new Error(`No API keys configured for ${provider}.`);

      try {
        switch (provider) {
          case 'openai':
            return await this.callOpenAI(prompt, key);
          case 'stability':
            return await this.callStability(prompt, key);
          case 'replicate':
            return await this.callReplicate(prompt, key, modelId || "black-forest-labs/flux-schnell");
          default:
            throw new Error("Unknown provider");
        }
      } catch (e: any) {
        if (e.status === 401 || e.status === 429) {
          this.healthMap.set(key, false);
          this.currentIndices[provider] = (this.currentIndices[provider] + 1) % keys.length;
          retryCount++;
          continue;
        }
        throw e;
      }
    }
    throw new Error(`Failed to generate image via ${provider} after multiple attempts.`);
  }

  private async callOpenAI(prompt: string, key: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      })
    });

    if (!response.ok) {
      const err = await response.json();
      const error = new Error(err.error?.message || "OpenAI API Error");
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return data.data[0].url;
  }

  private async callStability(prompt: string, key: string): Promise<string> {
    const engineId = 'stable-diffusion-xl-1024-v1-0';
    const response = await fetch(`https://api.stability.ai/v1/generation/${engineId}/text-to-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        steps: 30,
        samples: 1,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      const error = new Error(err.message || "Stability API Error");
      (error as any).status = response.status;
      throw error;
    }

    const data = await response.json();
    return `data:image/png;base64,${data.artifacts[0].base64}`;
  }

  private async callReplicate(prompt: string, key: string, model: string): Promise<string> {
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: model.includes('/') ? undefined : model,
        model: model.includes('/') ? model : undefined,
        input: { prompt: prompt }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      const error = new Error(err.detail || "Replicate API Error");
      (error as any).status = response.status;
      throw error;
    }

    let prediction = await response.json();
    while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
      await new Promise(r => setTimeout(r, 1500));
      const res = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Token ${key}` }
      });
      prediction = await res.json();
    }

    if (prediction.status === 'failed') throw new Error("Replicate prediction failed");
    return prediction.output[0];
  }
}

export const imageService = new ImageService();
