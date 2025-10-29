
"use client";

import type { Movie } from "@/lib/types";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, startAfter, Timestamp, type DocumentSnapshot } from "firebase/firestore";
import { fetchYouTubeDataForMovies, fetchYouTubeShorts } from "@/lib/youtube";
import { ShortsViewer } from "@/components/shorts-viewer";
import { Header } from "@/components/header";
import { getYouTubeVideoId, isPlayableOrGoogleDrive } from "@/lib/utils";

const PAGE_SIZE = 10;

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const filterAndSetShorts = useCallback((newShorts: Movie[]) => {
    const uniqueIds = new Set<string>();
    const allUniqueShorts = [...shorts, ...newShorts].filter(movie => {
        const videoId = getYouTubeVideoId(movie.url) || movie.id; 
        if (videoId && !uniqueIds.has(videoId)) {
            uniqueIds.add(videoId);
            return true;
        }
        return false;
    });

    const shortVideos = allUniqueShorts.filter(movie => movie.duration && movie.duration < 300);

    shortVideos.sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA;
    });
    
    setShorts(shortVideos);
  }, [shorts]);

  const loadInitialShorts = useCallback(async () => {
    setLoading(true);

    const firstBatchQuery = query(collection(db, "movies"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    const documentSnapshots = await getDocs(firstBatchQuery);
    
    let moviesFromDb = documentSnapshots.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
      } as Movie
    }).filter(movie => isPlayableOrGoogleDrive(movie.url));
    
    const lastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1];
    setLastVisible(lastVisibleDoc);

    const shortsFromApiData = await fetchYouTubeShorts("trending shorts");
    setNextPageToken(shortsFromApiData.nextPageToken);

    const moviesWithData = await fetchYouTubeDataForMovies(moviesFromDb);
    
    const combined = [...moviesWithData, ...shortsFromApiData.videos];

    const uniqueIds = new Set<string>();
    const uniqueShorts = combined.filter(movie => {
        const videoId = getYouTubeVideoId(movie.url) || movie.id; 
        if (videoId && !uniqueIds.has(videoId)) {
            uniqueIds.add(videoId);
            return true;
        }
        return false;
    });

    const shortVideos = uniqueShorts.filter(movie => (movie.duration && movie.duration < 300) || !movie.duration);

    shortVideos.sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA;
    });
    
    setShorts(shortVideos);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadInitialShorts();
  }, [loadInitialShorts]);

  const loadMoreShorts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    let newMoviesFromDb: Movie[] = [];
    let newShortsFromApi: Movie[] = [];

    if (lastVisible) {
      const nextBatchQuery = query(
        collection(db, "movies"), 
        orderBy("createdAt", "desc"), 
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      const documentSnapshots = await getDocs(nextBatchQuery);
      newMoviesFromDb = documentSnapshots.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as Movie
      }).filter(movie => isPlayableOrGoogleDrive(movie.url));
      
      const newLastVisible = documentSnapshots.docs[documentSnapshots.docs.length - 1];
      setLastVisible(newLastVisible || null);
    }

    if (nextPageToken) {
      const shortsFromApiData = await fetchYouTubeShorts("trending shorts", nextPageToken);
      newShortsFromApi = shortsFromApiData.videos;
      setNextPageToken(shortsFromApiData.nextPageToken);
    }
    
    if(newMoviesFromDb.length === 0 && newShortsFromApi.length === 0) {
        setHasMore(false);
    } else {
        const newMoviesWithData = await fetchYouTubeDataForMovies(newMoviesFromDb);
        const combined = [...newMoviesWithData, ...newShortsFromApi];
        
        setShorts(prevShorts => {
            const existingIds = new Set(prevShorts.map(s => getYouTubeVideoId(s.url) || s.id));
            const uniqueNewShorts = combined.filter(movie => {
                const videoId = getYouTubeVideoId(movie.url) || movie.id;
                if (videoId && !existingIds.has(videoId)) {
                    existingIds.add(videoId);
                    return true;
                }
                if (!videoId) return true; // Keep non-youtube videos
                return false;
            });
            const shortVideos = uniqueNewShorts.filter(movie => (movie.duration && movie.duration < 300) || !movie.duration);
            return [...prevShorts, ...shortVideos];
        });
    }

    setLoadingMore(false);
  }, [loadingMore, hasMore, lastVisible, nextPageToken]);
  
  const filteredShorts = useMemo(() => {
    if (!searchQuery) {
      return shorts;
    }
    return shorts.filter((short) =>
      short.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shorts, searchQuery]);


  return (
    <div className="flex h-screen w-full flex-col bg-black text-foreground">
       <Header onSearch={setSearchQuery} />
       <main className="flex-1">
         {loading ? (
            <div className="flex items-center justify-center h-full">
                <div className="w-full max-w-sm aspect-[9/16] bg-muted rounded-lg animate-pulse"></div>
            </div>
         ) : (
            filteredShorts.length > 0 ? (
              <ShortsViewer 
                movies={filteredShorts} 
                onEndReached={loadMoreShorts} 
                isLoadingMore={loadingMore}
              />
            ) : (
               <div className="flex flex-col h-full items-center justify-center rounded-lg bg-black text-center p-4">
                  <h3 className="text-lg font-semibold tracking-tight text-white">No new shorts</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check back later!
                  </p>
                </div>
            )
         )}
       </main>
    </div>
  );
}
