
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, collection, onSnapshot, query, orderBy, limit, Timestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Movie } from '@/lib/types';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Heart, Download, ListPlus, Share2, PlayCircle } from 'lucide-react';
import { MovieList } from '@/components/movie-list';
import { getYouTubeEmbedUrl, getGoogleDriveEmbedUrl, isLiveStream, formatNumber } from '@/lib/utils';
import Image from 'next/image';
import AdMobBanner from '@/components/admob-banner';
import { fetchYouTubeDataForMovies } from '@/lib/youtube';
import ReactPlayer from 'react-player';
import { useToast } from '@/hooks/use-toast';


export default function WatchPageContent() {
  const searchParams = useSearchParams();
  const docId = searchParams.get('v');
  const [movie, setMovie] = useState<Movie | null>(null);
  const [suggestedMovies, setSuggestedMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
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
    const q = query(collection(db, "movies"), orderBy("votes", "desc"), limit(20));
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
      
      const longVideos = moviesWithYTData.filter(m => !m.duration || m.duration >= 300);

      setSuggestedMovies(longVideos.slice(0, 10));
    });

    return () => unsub();
  }, []);
  
  const embedUrl = useMemo(() => {
    if (!movie?.url) return null;

    if (movie.url.includes('drive.google.com')) {
      return getGoogleDriveEmbedUrl(movie.url);
    }
    
    const ytEmbedUrl = getYouTubeEmbedUrl(movie.url);
    if (ytEmbedUrl) {
        return `${ytEmbedUrl}?autoplay=1&rel=0`;
    }
    
    return null;
  }, [movie?.url]);

  const canPlayDirectly = useMemo(() => {
     if (!movie?.url) return false;
     return ReactPlayer.canPlay(movie.url) || !!getYouTubeEmbedUrl(movie.url) || !!getGoogleDriveEmbedUrl(movie.url);
  }, [movie?.url]);

  const handleWatchNow = () => {
    if (movie?.url) {
      if(canPlayDirectly) {
        setShowPlayer(true);
      } else {
        window.open(movie.url, '_blank', 'noopener,noreferrer');
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

  const otherMovies = suggestedMovies.filter(m => m.id !== movie.id);

  const metadata = [
    { label: "Print", value: "HD 720p" },
    { label: "Industry", value: "South" },
    { label: "Category", value: "Comedy, Drama, Thriller" },
    { label: "Language", value: "Hindi" },
    { label: "Quality", value: "480p, 720p" },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        {showPlayer ? (
            <div className="aspect-video overflow-hidden bg-black">
            {isClient && canPlayDirectly ? (
                isLiveStream(movie.url) || !embedUrl ? (
                    <ReactPlayer
                        key={movie.id}
                        url={movie.url}
                        width="100%"
                        height="100%"
                        playing={true}
                        controls={true}
                    />
                ) : (
                    <iframe
                        key={movie.id}
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
                    <Button onClick={() => window.open(movie.url, '_blank', 'noopener,noreferrer')}>
                        Watch on original site
                    </Button>
                </div>
            )}
            </div>
        ) : (
            <div className="aspect-video overflow-hidden bg-black relative">
                 <Image 
                    src={movie.thumbnailUrl || 'https://placehold.co/1280x720.png'}
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
                    src={movie.thumbnailUrl || 'https://placehold.co/96x144.png'}
                    alt={`Poster for ${movie.title}`}
                    width={96}
                    height={144}
                    className="rounded-md object-cover"
                    data-ai-hint="movie poster"
                />
            </div>
          </div>

          <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg" onClick={() => setShowPlayer(!showPlayer)}>
            <PlayCircle className="mr-2 h-6 w-6" />
            {showPlayer ? 'Close Player' : 'Watch Now'}
          </Button>

          <div className="py-2">
            <AdMobBanner />
          </div>
          
          <div className="flex justify-around text-center py-2">
            <button onClick={handleLike} disabled={isLiked} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:hover:text-muted-foreground">
              <Heart className={`h-6 w-6 ${isLiked ? 'text-red-500 fill-current' : ''}`}/>
              <span className="text-xs font-semibold">{movie.votes ? formatNumber(movie.votes) : 'Like'}</span>
            </button>
             <button onClick={handleComingSoon} className="flex flex-col items-center space-y-1 text-muted-foreground hover:text-foreground transition-colors">
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

          <div>
            <h2 className="text-lg font-semibold mb-4">Recommended For You</h2>
            <MovieList movies={otherMovies} variant="grid-condensed" />
          </div>
        </div>

      </main>
    </div>
  );
}
