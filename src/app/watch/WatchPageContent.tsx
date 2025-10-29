
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, onSnapshot, query, orderBy, limit, Timestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movie, Episode } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Heart, Download, ListPlus, Share2, PlayCircle, ChevronRight } from 'lucide-react';
import { MovieList } from '@/components/movie-list';
import { getYouTubeEmbedUrl, getGoogleDriveEmbedUrl, isLiveStream, formatNumber, getYouTubeVideoId } from '@/lib/utils';
import Image from 'next/image';
import AdMobBanner from '@/components/admob-banner';
import { fetchYouTubeDataForMovies } from '@/lib/youtube';
import ReactPlayer from 'react-player';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export default function WatchPageContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get('v');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const { toast } = useToast();


  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!docId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setShowPlayer(false);
    setCurrentEpisodeIndex(0);
    const docRef = doc(db, 'movies', docId);

    const unsub = onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const movieData = { 
              id: docSnap.id, 
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
            } as Movie;
            
            const [movieWithYTData] = await fetchYouTubeDataForMovies([movieData]);

            if (movieWithYTData.episodes && movieWithYTData.episodes.length > 0) {
              const episodeMovies: Movie[] = movieWithYTData.episodes.map((ep, index) => ({
                id: `${docSnap.id}-ep-${index}`,
                title: ep.title,
                url: ep.url,
                votes: 0,
                createdAt: movieWithYTData.createdAt
              }));
              const episodesWithYTData = await fetchYouTubeDataForMovies(episodeMovies);
              movieWithYTData.episodes = episodesWithYTData.map(epData => ({ title: epData.title, url: epData.url }));
            }

            setMovie(movieWithYTData);
        } else {
            console.log('No such document!');
            setMovie(null);
        }
        setLoading(false);
    });

    return () => unsub();

  }, [docId]);

  useEffect(() => {
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snapshot) => {
      const moviesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as Movie;
      });
      const moviesWithYTData = await fetchYouTubeDataForMovies(moviesData);
      setAllMovies(moviesWithYTData);
    });

    return () => unsub();
  }, []);

  const suggestedMovies = useMemo(() => {
    if (!movie || allMovies.length === 0) {
      return [];
    }
  
    const otherMovies = allMovies.filter(m => m.id !== movie.id);
  
    // Logic to find movies from the same series
    const currentTitleLower = movie.title.toLowerCase();
    const baseTitleMatch = currentTitleLower.match(/^([a-zA-Z\s]+)/);
    const baseTitle = baseTitleMatch ? baseTitleMatch[1].trim() : currentTitleLower;
    
    let similarByTitle: Movie[] = [];
    if (baseTitle.length > 3) { // Avoid matching short common words
      similarByTitle = otherMovies.filter(m =>
        m.title.toLowerCase().startsWith(baseTitle)
      );
    }
  
    // Fallback to popular movies
    const popular = otherMovies.sort((a, b) => b.votes - a.votes);
  
    // Combine lists, ensuring no duplicates
    const recommendations = [...similarByTitle];
    const recommendationIds = new Set(recommendations.map(r => r.id));
  
    for (const p of popular) {
      if (!recommendationIds.has(p.id)) {
        recommendations.push(p);
        recommendationIds.add(p.id);
      }
    }
  
    return recommendations.slice(0, 10);
  }, [movie, allMovies]);
  
  const currentVideoUrl = useMemo(() => {
    if (!movie) return null;
    if (movie.episodes && movie.episodes.length > 0) {
      return movie.episodes[currentEpisodeIndex]?.url || null;
    }
    return movie.url;
  }, [movie, currentEpisodeIndex]);

  const embedUrl = useMemo(() => {
    if (!currentVideoUrl) return null;

    if (currentVideoUrl.includes('drive.google.com')) {
      return getGoogleDriveEmbedUrl(currentVideoUrl);
    }
    
    const ytEmbedUrl = getYouTubeEmbedUrl(currentVideoUrl);
    if (ytEmbedUrl) {
        return `${ytEmbedUrl}?autoplay=1&rel=0`;
    }
    
    return null;
  }, [currentVideoUrl]);

  const canPlayDirectly = useMemo(() => {
     if (!currentVideoUrl) return false;
     return ReactPlayer.canPlay(currentVideoUrl) || !!getYouTubeEmbedUrl(currentVideoUrl) || !!getGoogleDriveEmbedUrl(currentVideoUrl);
  }, [currentVideoUrl]);

  const handleWatchNow = () => {
    if (currentVideoUrl) {
      if(canPlayDirectly) {
        setShowPlayer(true);
      } else {
        window.open(currentVideoUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleShare = async () => {
    if (!movie) return;
  
    const shareUrl = `${window.location.origin}/watch?v=${movie.id}`;
  
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link Copied',
        description: 'The video link has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Could not copy the video link at this time.',
      });
    }
  };

  const handleDownload = () => {
    if (!currentVideoUrl) return;
    window.open(currentVideoUrl, '_blank', 'noopener,noreferrer');
    toast({
        title: "Download Started",
        description: "Your video is being downloaded.",
    });
  };

  const handleComingSoon = () => {
    toast({
      title: 'Feature Coming Soon',
      description: 'This feature will be available on 01/01/2026.',
    });
  };

  const handleLike = async () => {
    if (!docId || isLiked) return;
    const movieRef = doc(db, "movies", docId);
    try {
      await updateDoc(movieRef, {
        votes: increment(1)
      });
      setIsLiked(true);
       toast({
        title: "Liked!",
        description: "You've liked this video.",
      });
    } catch (error) {
        console.error("Error liking video: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not like the video. Please try again.",
        });
    }
  };


  if (loading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
            <Header />
            <div className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
                <div className="aspect-video bg-muted rounded-lg animate-pulse"></div>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-8 w-3/4 bg-muted rounded animate-pulse"></div>
                    <div className="h-5 w-1/2 bg-muted rounded animate-pulse"></div>
                    <div className="h-5 w-1/3 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="w-24 h-36 bg-muted rounded-md animate-pulse"></div>
                </div>
                <div className="h-12 w-full bg-muted rounded-lg animate-pulse"></div>
                <div className="flex justify-around py-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
                      <div className="h-8 w-8 bg-muted rounded-full"></div>
                      <div className="h-4 w-12 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
            </div>
        </div>
    );
  }

  if (!movie) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
         <Header />
         <div className="flex-1 flex items-center justify-center">
            <p>Video not found.</p>
         </div>
       </div>
    );
  }

  const metadata = [
    { label: "Season", value: "S1E1" },
    { label: "Language", value: "Dual [Hindi-English]" },
    { label: "Category", value: "Crime, Documentary" },
    { label: "Industry", value: "Netflix" },
  ];

  const mainThumbnail = movie.thumbnailUrl || (movie.episodes && movie.episodes.length > 0 ? `https://i3.ytimg.com/vi/${getYouTubeVideoId(movie.episodes[0].url)}/hqdefault.jpg` : 'https://placehold.co/1280x720.png');

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        {showPlayer ? (
            <div className="aspect-video overflow-hidden bg-black">
            {isClient && canPlayDirectly ? (
                isLiveStream(currentVideoUrl || "") || !embedUrl ? (
                    <ReactPlayer
                        key={currentVideoUrl}
                        url={currentVideoUrl || ""}
                        width="100%"
                        height="100%"
                        playing={true}
                        controls={true}
                    />
                ) : (
                    <iframe
                        key={currentVideoUrl}
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title="Video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                )
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4">
                    <p className="text-center mb-4">This video cannot be played directly here.</p>
                    <Button onClick={() => window.open(currentVideoUrl || "", '_blank', 'noopener,noreferrer')}>
                        Watch on original site
                    </Button>
                </div>
            )}
            </div>
        ) : (
            <div className="aspect-video overflow-hidden bg-black relative">
                 <Image 
                    src={mainThumbnail}
                    alt={`Poster for ${movie.title}`}
                    fill
                    className="object-cover"
                    data-ai-hint="movie poster background"
                />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Button size="lg" variant="ghost" className="text-white hover:bg-white/20 hover:text-white" onClick={handleWatchNow}>
                        <PlayCircle className="mr-2 h-12 w-12" />
                    </Button>
                </div>
            </div>
        )}

        <div className="p-4 space-y-4">
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl font-bold">{movie.title}</h1>
              {!isLiveStream(movie.url) && metadata.map(item => (
                <div key={item.label} className="text-sm">
                  <span className="font-semibold text-primary">{item.label}: </span>
                  <span className="text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="w-24 shrink-0">
                <Image 
                    src={mainThumbnail}
                    alt={`Poster for ${movie.title}`}
                    width={96}
                    height={144}
                    className="rounded-md object-cover"
                    data-ai-hint="movie poster"
                />
            </div>
          </div>

          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg" onClick={handleWatchNow}>
            <PlayCircle className="mr-2 h-6 w-6" />
            {showPlayer ? 'Close Player' : (movie.episodes && movie.episodes.length > 0 ? `Play Episode ${currentEpisodeIndex + 1}` : 'Watch Now')}
          </Button>

          <div className="py-2">
            <AdMobBanner />
          </div>
          
          <div className="flex justify-around text-center py-2">
            <button onClick={handleLike} disabled={isLiked} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:hover:text-muted-foreground">
              <Heart className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-current' : ''}`}/>
              <span className="text-xs font-semibold">{movie.votes ? formatNumber(movie.votes) : 'Like'}</span>
            </button>
             <button onClick={handleDownload} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors">
              <Download className="h-6 w-6"/>
              <span className="text-xs font-semibold">Download</span>
            </button>
             <button onClick={handleComingSoon} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors">
              <ListPlus className="h-6 w-6"/>
              <span className="text-xs font-semibold">My List</span>
            </button>
             <button onClick={handleShare} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="h-6 w-6"/>
              <span className="text-xs font-semibold">Share</span>
            </button>
          </div>

          {movie.episodes && movie.episodes.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Episodes ({currentEpisodeIndex + 1}/{movie.episodes.length})</h2>
                <Button variant="ghost" size="sm">See all <ChevronRight className="h-4 w-4 ml-1" /></Button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {movie.episodes.map((ep, index) => (
                  <button 
                    key={index}
                    onClick={() => setCurrentEpisodeIndex(index)}
                    className={cn(
                      "h-12 w-12 flex-shrink-0 rounded-md flex items-center justify-center font-bold text-lg border-2",
                      currentEpisodeIndex === index 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-card border-border hover:bg-muted"
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}


          <div>
            <h2 className="text-lg font-semibold mb-4">Recommended For You</h2>
            <MovieList movies={suggestedMovies} variant="grid-condensed" />
          </div>
        </div>

      </main>
    </div>
  );
}
