
// @ts-nocheck
'use server';

import type { Movie } from './types';
import { getYouTubeVideoId, parseISO8601Duration } from './utils';
import fetch from 'node-fetch';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export interface YouTubeShortsResponse {
  videos: Movie[];
  nextPageToken?: string;
}


export async function fetchYouTubeDataForMovies(movies: Movie[]): Promise<Movie[]> {
  if (!YOUTUBE_API_KEY) {
    console.log("YouTube API Key not found, skipping API call.");
    return movies;
  }

  const videoIds = movies
    .map((movie) => getYouTubeVideoId(movie.url))
    .filter(Boolean) as string[];
  
  if (videoIds.length === 0) return movies;

  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds.join(
    ','
  )}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.items) {
      const youtubeDataMap = new Map(
        data.items.map((item: any) => [item.id, item])
      );

      const moviesWithChannelData = await fetchChannelDataForMovies(data.items);
      const channelDataMap = new Map(
        moviesWithChannelData.map((movie) => [getYouTubeVideoId(movie.url), movie.channelThumbnailUrl])
      );

      return movies.map((movie) => {
        const videoId = getYouTubeVideoId(movie.url);
        if (videoId && youtubeDataMap.has(videoId)) {
          const item = youtubeDataMap.get(videoId);
          return {
            ...movie,
            title: item.snippet.title,
            thumbnailUrl:
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.default?.url,
            channelTitle: item.snippet.channelTitle,
            viewCount: item.statistics.viewCount,
            publishedAt: item.snippet.publishedAt,
            duration: parseISO8601Duration(item.contentDetails.duration),
            channelThumbnailUrl: channelDataMap.get(videoId) || movie.channelThumbnailUrl,
          };
        }
        return movie;
      });
    }
    return movies;
  } catch (error) {
    console.error('Error fetching YouTube data:', error);
    return movies;
  }
}

async function fetchChannelDataForMovies(youtubeItems: any[]): Promise<Movie[]> {
  const channelIds = youtubeItems.map(item => item.snippet.channelId).filter(Boolean);
  if (channelIds.length === 0 || !YOUTUBE_API_KEY) return [];

  const apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds.join(
    ','
  )}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.items) {
      const channelThumbnailMap = new Map(
        data.items.map((item: any) => [item.id, item.snippet.thumbnails.default?.url])
      );

      // This part is a bit tricky. We are mapping over youtubeItems which are from the VIDEOS endpoint
      // to create a map of channel IDs to channel thumbnails.
      // Then we create Movie-like objects to pass this data back.
      // The calling function then needs to map this back to the original movies.
      const movieLikeObjects = youtubeItems.map(item => ({
        // We only care about these properties for mapping
        id: item.id, // videoId
        url: `https://www.youtube.com/watch?v=${item.id}`,
        channelId: item.snippet.channelId,
        channelThumbnailUrl: channelThumbnailMap.get(item.snippet.channelId),
      } as any));

      return movieLikeObjects;
    }
    return [];
  } catch (error) {
    console.error('Error fetching channel data:', error);
    return [];
  }
}


// Fetch YouTube Shorts videos
export async function fetchYouTubeShorts(query: string = "shorts", pageToken?: string): Promise<YouTubeShortsResponse> {
  const emptyResponse = { videos: [], nextPageToken: undefined };
  if (!YOUTUBE_API_KEY) {
    console.log("YouTube API Key not found, skipping API call for shorts.");
    return emptyResponse;
  }
  try {
    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${query}&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`;
    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }
    const res = await fetch(url);
    const data = await res.json();

    if (!data.items) return emptyResponse;

    const videos: Movie[] = data.items.map((item: any) => ({
      id: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.high.url,
      channelThumbnailUrl: "", 
      votes: 0,
      createdAt: item.snippet.publishedAt,
      duration: 60, // Assuming shorts are <= 60 seconds
    }));

    return {
        videos,
        nextPageToken: data.nextPageToken,
    };
  } catch (err) {
    console.error("Error fetching YouTube Shorts:", err);
    return emptyResponse;
  }
}
