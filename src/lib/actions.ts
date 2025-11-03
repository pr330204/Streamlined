
"use server";

import { suggestMovie, SuggestMovieInput } from "@/ai/flows/suggest-movie-from-prompt";
import { z } from "zod";
import { adminDb, adminMessaging } from "./firebase-admin";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Movie, User } from "./types";
import { getYouTubeThumbnail } from "./utils";

const suggestMovieSchema = z.object({
  prompt: z.string().min(10, "Please provide a more detailed description."),
});

export async function suggestMovieAction(values: SuggestMovieInput) {
  const validated = suggestMovieSchema.safeParse(values);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.errors[0].message,
    };
  }
  try {
    const result = await suggestMovie(validated.data);
    return {
      success: true,
      movieTitle: result.movieTitle,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "AI failed to suggest a movie. Please try again.",
    };
  }
}


export async function sendNewContentNotification(movie: Movie) {
  if (!adminDb || !adminMessaging) {
    const errorMessage = "Firebase Admin SDK not initialized. Cannot send notifications.";
    console.error(errorMessage);
    return { success: false, message: errorMessage };
  }

  try {
    const usersSnapshot = await getDocs(collection(adminDb, 'users'));
    
    const tokens: string[] = [];
    usersSnapshot.forEach(doc => {
      const user = doc.data() as User;
      if (user.fcmToken) {
        tokens.push(user.fcmToken);
      }
    });

    if (tokens.length === 0) {
      console.log("No registered FCM tokens found.");
      return { success: true, message: "No users to notify." };
    }
    
    const imageUrl = movie.thumbnailUrl || (movie.url ? getYouTubeThumbnail(movie.url) : 'https://placehold.co/1280x720.png');

    const message = {
      notification: {
        title: `Watch ${movie.title} Now!`,
        body: 'Stream or Download Now!',
      },
      webpush: {
        notification: {
          title: `Watch ${movie.title} Now!`,
          body: 'Stream or Download Now!',
          image: imageUrl || undefined,
          icon: '/favicon.ico', 
        },
        fcm_options: {
          link: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/watch?v=${movie.id}`
        }
      },
      tokens: tokens,
    };

    const response = await adminMessaging.sendEachForMulticast(message);
    
    console.log(`${response.successCount} messages were sent successfully`);
    if (response.failureCount > 0) {
      console.error(`Failed to send ${response.failureCount} messages.`);
      response.responses.forEach(resp => {
        if (!resp.success) {
          console.error(`Error for token: ${resp.messageId}`, resp.error);
        }
      });
    }
    
    return { success: true, message: "Notifications sent!" };
  } catch (error) {
    console.error("Error sending notifications:", error);
    return { success: false, message: "Failed to send notifications." };
  }
}
