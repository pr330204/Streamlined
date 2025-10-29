
"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MoviesPage from "./movies/page";
import WebSeriesPage from "./web-series/page";
import PodcastsPage from "./podcasts/page";
import AdMobBanner from "@/components/admob-banner";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header onSearch={setSearchQuery} />
      <main className="flex-1">
        <Tabs defaultValue="movies" className="w-full">
          <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm">
            <div className="container max-w-7xl mx-auto px-4">
              <TabsList className="grid w-full grid-cols-3 h-12">
                <TabsTrigger value="movies" className="text-base">Movies</TabsTrigger>
                <TabsTrigger value="web-series" className="text-base">Web Series</TabsTrigger>
                <TabsTrigger value="podcasts" className="text-base">Podcasts</TabsTrigger>
              </TabsList>
            </div>
          </div>
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <TabsContent value="movies">
              <MoviesPage searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="web-series">
              <WebSeriesPage searchQuery={searchQuery} />
            </TabsContent>
            <TabsContent value="podcasts">
              <PodcastsPage searchQuery={searchQuery} />
            </TabsContent>
          </div>
        </Tabs>
      </main>
      <AdMobBanner />
    </div>
  );
}
