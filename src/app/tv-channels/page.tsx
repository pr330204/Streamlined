
"use client";

import type { Movie } from "@/lib/types";
import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, Timestamp } from "firebase/firestore";
import { MovieList } from "@/components/movie-list";
import { fetchYouTubeDataForMovies } from "@/lib/youtube";
import { getYouTubeVideoId } from "@/lib/utils";

interface TvChannelsPageProps {
  searchQuery: string;
}

export default function TvChannelsPage({ searchQuery }: TvChannelsPageProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "movies"),
      where("category", "==", "tv-channel"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const moviesFromDb = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as Movie
      });
      
      const youtubeMovies = moviesFromDb.filter(movie => getYouTubeVideoId(movie.url));
      const otherMovies = moviesFromDb.filter(movie => !getYouTubeVideoId(movie.url));

      if (youtubeMovies.length > 0) {
        fetchYouTubeDataForMovies(youtubeMovies).then(ytMoviesWithData => {
           const allMovies = [...ytMoviesWithData, ...otherMovies];
           
           allMovies.sort((a, b) => {
              const dateA = new Date(a.createdAt as string).getTime();
              const dateB = new Date(b.createdAt as string).getTime();
              return dateB - dateA;
           });

           setMovies(allMovies);
           setLoading(false);
        });
      } else {
        setMovies(otherMovies);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const filteredMovies = useMemo(() => {
    if (!searchQuery) {
      return movies;
    }
    return movies.filter((movie) =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [movies, searchQuery]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col gap-2 animate-pulse">
            <div className="w-full aspect-video bg-muted rounded-lg"></div>
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-muted rounded-full shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <MovieList movies={filteredMovies} />
  );
}
