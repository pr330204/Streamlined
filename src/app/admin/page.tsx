
"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { AddMovieDialog } from "@/components/add-movie-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AdminDeletePanel from "./delete/page";
import AdminChatPanel from "./chat/page";
import AdminUsersPanel from "./users/page";
import { Video, Trash2, Users, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { Movie } from "@/lib/types";


const ADMIN_PASSWORD = "Prashant";

export default function AdminPage() {
  const [isAddMovieOpen, setAddMovieOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect Password",
        description: "Please try again.",
      });
    }
    setPassword("");
  };

  const handleAddMovie = async (movie: Omit<Movie, "id" | "votes" | "createdAt" | "duration">) => {
    const movieData: any = {
      ...movie,
      votes: 0,
      createdAt: serverTimestamp(),
    };

    if (!movieData.thumbnailUrl) {
      delete movieData.thumbnailUrl;
    }
    
    await addDoc(collection(db, "movies"), movieData);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col px-4 py-6 md:px-6 lg:px-8">
        <div className="container max-w-5xl mx-auto flex flex-1 flex-col">
          {!isAuthenticated ? (
            <div className="max-w-sm mx-auto pt-20">
              <h1 className="text-2xl font-bold text-center mb-2">Admin Panel</h1>
              <p className="text-muted-foreground text-center mb-6">
                Please enter the password to access admin features.
              </p>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                  />
                </div>
                <Button type="submit" className="w-full">Enter</Button>
              </form>
            </div>
          ) : (
            <Tabs defaultValue="add-video" className="w-full flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <TabsList>
                  <TabsTrigger value="add-video"><Video className="w-4 h-4 mr-2"/> Add Video</TabsTrigger>
                  <TabsTrigger value="delete-video"><Trash2 className="w-4 h-4 mr-2"/> Delete Video</TabsTrigger>
                  <TabsTrigger value="user-chats"><MessageSquare className="w-4 h-4 mr-2"/> User Chats</TabsTrigger>
                  <TabsTrigger value="user-coins"><Users className="w-4 h-4 mr-2"/> User Coins</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="add-video">
                 <div className="flex flex-col items-center justify-center text-center py-20 border rounded-lg">
                    <h2 className="text-2xl font-bold">Add a New Video</h2>
                    <p className="text-muted-foreground mt-2 mb-4">Click the button below to open the dialog and add a new video.</p>
                    <Button onClick={() => setAddMovieOpen(true)}>
                        <Video className="mr-2 h-4 w-4" />
                        Add New Video
                    </Button>
                 </div>
              </TabsContent>
              <TabsContent value="delete-video">
                <AdminDeletePanel />
              </TabsContent>
              <TabsContent value="user-chats" className="flex-1">
                <AdminChatPanel />
              </TabsContent>
              <TabsContent value="user-coins">
                <AdminUsersPanel />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>
      <AddMovieDialog
        isOpen={isAddMovieOpen}
        onOpenChange={setAddMovieOpen}
        onMovieAdded={handleAddMovie}
      />
    </div>
  );
}
