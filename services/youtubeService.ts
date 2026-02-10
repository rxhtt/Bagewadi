import { YoutubeShort, MediaItemType } from "../types";

export class YoutubeService {
  private apiKeys: string[] = [];
  private currentKeyIndex: number = 0;
  private healthMap: Map<string, boolean> = new Map();
  private seenIds: Set<string> = new Set();

  setKeys(keys: string[]) {
    this.apiKeys = [...new Set(keys.filter(k => k.trim().length > 0))];
    this.healthMap.clear();
    this.seenIds.clear();
  }

  private getNextKey(): string | null {
    if (this.apiKeys.length === 0) return null;
    for (let i = 0; i < this.apiKeys.length; i++) {
      const idx = (this.currentKeyIndex + i) % this.apiKeys.length;
      const key = this.apiKeys[idx];
      if (this.healthMap.get(key) !== false) {
        this.currentKeyIndex = (idx + 1) % this.apiKeys.length;
        return key;
      }
    }
    return null;
  }

  async fetchMedia(query: string, type: MediaItemType = 'video', maxResults: number = 20): Promise<YoutubeShort[]> {
    let retryCount = 0;
    
    // Improved query modification for better results and infinite variety
    let enhancedQuery = query;
    if (type === 'music') {
      enhancedQuery = `${query} music official audio -video -vlog`;
    } else if (type === 'short') {
      enhancedQuery = `${query} #shorts vertical short video`;
    } else if (type === 'video') {
      enhancedQuery = `${query} -shorts -short`;
    }

    // Add a random seed if it's a 'trending' search to get variety
    if (query.toLowerCase().includes('trending') || query.toLowerCase().includes('top')) {
       const seeds = ["latest", "global", "new", "hot", "viral", "2025"];
       enhancedQuery += ` ${seeds[Math.floor(Math.random() * seeds.length)]}`;
    }

    while (retryCount < this.apiKeys.length) {
      const key = this.getNextKey();
      if (!key) break;

      try {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${maxResults}&q=${encodeURIComponent(enhancedQuery)}&type=video&relevanceLanguage=en&regionCode=US&key=${key}${type === 'short' ? '&videoDuration=short' : ''}`;
        
        const response = await fetch(searchUrl);
        if (response.status === 403 || response.status === 429) {
          this.healthMap.set(key, false);
          retryCount++;
          continue;
        }

        const data = await response.json();
        const items = data.items || [];
        
        return items
          .filter((item: any) => !this.seenIds.has(item.id.videoId))
          .map((item: any) => {
            this.seenIds.add(item.id.videoId);
            return {
              id: item.id.videoId,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
              type: type,
              description: item.snippet.description
            };
          });

      } catch (e) {
        retryCount++;
      }
    }
    return [];
  }

  async getShorts(query: string = "trending shorts"): Promise<YoutubeShort[]> {
    return this.fetchMedia(query, 'short');
  }

  async getMusic(query: string = "top global music charts"): Promise<YoutubeShort[]> {
    return this.fetchMedia(query, 'music');
  }

  async getVideos(query: string = "trending global videos"): Promise<YoutubeShort[]> {
    return this.fetchMedia(query, 'video');
  }
}

export const youtubeService = new YoutubeService();