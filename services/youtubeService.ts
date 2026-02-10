import { YoutubeShort } from "../types";

export class YoutubeService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private healthMap: Map<string, boolean> = new Map();

  setKeys(keys: string[]) {
    this.apiKeys = [...new Set(keys.filter(k => k.trim().length > 0))];
    // Reset health map when new keys are provided
    this.healthMap.clear();
  }

  private getNextKey(): string | null {
    if (this.apiKeys.length === 0) return null;
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      
      if (this.healthMap.get(key) !== false) {
        this.currentKeyIndex = (idx + 1) % this.apiKeys.length; // Advance for next call
        return key;
      }
    }
    return null;
  }

  async getShorts(query: string = "trending"): Promise<YoutubeShort[]> {
    let retryCount = 0;
    while (retryCount < this.apiKeys.length) {
      const key = this.getNextKey();
      if (!key) break;

      try {
        const searchQuery = `${query} #shorts`;
        // Added regionCode=US and relevanceLanguage=en to stabilize results across VPNs
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=id&maxResults=15&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=short&regionCode=US&relevanceLanguage=en&key=${key}`;
        
        const response = await fetch(searchUrl);
        
        if (response.status === 403 || response.status === 429) {
          this.healthMap.set(key, false);
          retryCount++;
          continue;
        }

        const searchData = await response.json();
        // Check if items exist and map to IDs
        const videoIds = searchData.items
          ?.map((item: any) => item.id?.videoId)
          .filter(Boolean)
          .join(',');

        if (!videoIds) {
          retryCount++;
          continue;
        }
        
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,player,contentDetails&id=${videoIds}&key=${key}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();

        if (!detailsData.items) return [];

        return detailsData.items.map((item: any) => {
          const embedHtml = item.player?.embedHtml || '';
          // Improved vertical check: Shorts usually have a specific aspect ratio in embed code
          const isVertical = !embedHtml.includes('width="480"'); 

          return {
            id: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            isVertical: isVertical
          };
        });

      } catch (e) {
        console.error("YoutubeService Error:", e);
        retryCount++;
      }
    }
    return [];
  }
}

export const youtubeService = new YoutubeService();