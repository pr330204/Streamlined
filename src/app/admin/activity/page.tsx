
"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, orderBy, Timestamp } from "firebase/firestore";
import type { User, UserSession } from "@/lib/types";
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

export default function AdminActivityPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch all users for the dropdown
    const usersQuery = query(collection(db, "users"), orderBy("name", "asc"));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersFromDb = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as User));
      setUsers(usersFromDb);
    });

    return () => unsubUsers();
  }, []);
  
  useEffect(() => {
    if (!selectedUserId || !date) {
      setSessions([]);
      return;
    };

    setLoading(true);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sessionsQuery = query(
        collection(db, "user-sessions"),
        orderBy("startTime", "asc"),
        where("userId", "==", selectedUserId),
        where("startTime", ">=", Timestamp.fromDate(startOfDay)),
        where("startTime", "<=", Timestamp.fromDate(endOfDay))
    );
    
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
        const sessionsFromDb = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                startTime: data.startTime,
                endTime: data.endTime,
            } as UserSession;
        });
        setSessions(sessionsFromDb);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching sessions:", error);
        setLoading(false);
    });

    return () => unsubSessions();

  }, [selectedUserId, date]);

  const totalDuration = useMemo(() => {
    return sessions.reduce((total, session) => total + (session.duration || 0), 0);
  }, [sessions]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };


  return (
    <div className="space-y-4">
        <h1 className="text-3xl font-bold">User Activity</h1>
        <p className="text-muted-foreground">
            Track user session time. Select a user and a date to see their activity.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
             <Select onValueChange={setSelectedUserId} value={selectedUserId || ""}>
                <SelectTrigger className="w-full sm:w-[280px]">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                    {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                    "w-full sm:w-[280px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                />
                </PopoverContent>
            </Popover>
        </div>
        
        {selectedUserId && date && (
            <div className="space-y-4 pt-4">
                 <div className="border rounded-lg p-4 bg-card">
                    <h2 className="text-lg font-semibold">
                        Total Time for <span className="text-primary">{users.find(u => u.id === selectedUserId)?.name}</span> on <span className="text-primary">{format(date, "PPP")}</span>
                    </h2>
                    <p className="text-4xl font-bold text-primary">{formatDuration(totalDuration)}</p>
                    <p className="text-sm text-muted-foreground">(Hours : Minutes : Seconds)</p>
                </div>

                <div className="border rounded-lg">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                Loading sessions...
                                </TableCell>
                            </TableRow>
                        ) : sessions.length > 0 ? (
                        sessions.map((session) => (
                            <TableRow key={session.id}>
                            <TableCell>{session.startTime ? format(session.startTime.toDate(), 'p') : 'N/A'}</TableCell>
                             <TableCell>{session.endTime ? format(session.endTime.toDate(), 'p') : <span className="text-yellow-500">In Progress</span>}</TableCell>
                            <TableCell className="text-right">{formatDuration(session.duration || 0)}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center">
                            No sessions found for this user on the selected date.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </div>
            </div>
        )}
    </div>
  );
}
