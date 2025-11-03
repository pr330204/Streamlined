
"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import type { Movie } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, BellRing } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast";
import { sendNewContentNotification } from "@/lib/actions";


export default function AdminDeletePanel() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "movies"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const moviesFromDb = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt
        } as Movie
      });
      setMovies(moviesFromDb);
      setLoading(false);
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

  const handleDeleteMovie = async (movieId: string) => {
    try {
      await deleteDoc(doc(db, "movies", movieId));
      toast({
        title: "Success",
        description: "Video has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting movie: ", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not delete the video. Please try again.",
      });
    }
  };

  const handleNotify = (movie: Movie) => {
    startTransition(async () => {
      const result = await sendNewContentNotification(movie);
      if (result.success) {
        toast({
          title: "Success",
          description: result.message || "Notifications sent to all users.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to send notifications.",
        });
      }
    });
  }
  
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Delete Videos</h1>
      <p className="text-muted-foreground">Search for a video by title and delete it from the library.</p>
      <div className="relative">
        <Input
          type="search"
          placeholder="Search by video title..."
          className="w-full bg-muted/40 pr-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-4 pt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg animate-pulse">
              <div className="h-5 w-3/4 bg-card rounded"></div>
              <div className="h-10 w-24 bg-card rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pt-4">
          {filteredMovies.length > 0 ? (
            filteredMovies.map(movie => (
              <div key={movie.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                <span className="font-medium truncate pr-4">{movie.title}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleNotify(movie)} disabled={isPending}>
                      <BellRing className="mr-2 h-4 w-4" />
                      Notify
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the video
                            <span className="font-bold"> &quot;{movie.title}&quot;</span>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteMovie(movie.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-10">No videos found.</p>
          )}
        </div>
      )}
    </div>
  );
}
