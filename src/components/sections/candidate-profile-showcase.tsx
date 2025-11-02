"use client";

import {
  Bell,
  Briefcase,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Link as LinkIcon,
  Mail,
  MapPin,
  Play,
  Plus,
  Search,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserPlus,
  Users,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const audioQuestions = [
  {
    id: 1,
    question: "What is the value of using Typescript vs Javascript?",
    subtext: "Feel free to get technical here!",
    time: "00:00",
    totalTime: "2:30",
  },
  {
    id: 2,
    question: "Walk us through a time you built something that failed.",
    subtext: "What did you learn from it?",
    time: "00:00",
    totalTime: "2:00",
  },
  {
    id: 3,
    question: "Tell us about yourself?",
    subtext: "Walk us through your origin story.",
    time: "00:00",
    totalTime: "1:10",
  },
];

const activityTimeline = [
  {
    id: 1,
    user: {
      name: "Dennis Bergkamp",
      role: "Co-Founder & CTO",
      avatar: "https://i.pravatar.cc/40?img=1",
    },
    timestamp: "Yesterday",
    comment:
      "Solid answers.. Let's definitely combine the HM + Portfolio review for sure",
  },
  {
    id: 2,
    user: {
      name: "Andrea Pirlo",
      role: "Founding Product Designer",
      avatar: "https://i.pravatar.cc/40?img=2",
    },
    timestamp: "Yesterday",
    comment:
      "You can really hear the passion and drive in their answers. Can definitely see myself working with them directly.",
  },
];

const SideNavItem = ({ icon, label, active = false }: { icon: React.ReactNode; label: React.ReactNode; active?: boolean }) => (
  <a
    href="#"
    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-zinc-800 text-white"
        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
    }`}
  >
    {icon}
    <span>{label}</span>
  </a>
);

export default function CandidateProfileShowcase() {
  return (
    <section className="w-full bg-white font-body text-text-primary py-12 px-4 md:px-6">
      <div className="grid w-full max-w-5xl mx-auto grid-cols-1 lg:grid-cols-[180px_1fr_280px] rounded-xl shadow-lg overflow-hidden border border-border">
        {/* Left Sidebar */}
        <aside className="bg-[#1e1e1e] text-white flex flex-col p-3 hidden lg:flex">
          <div className="mb-6">
            <Image
              src="https://framerusercontent.com/images/3fTRzVqDE2tYJAm3vxT2cW0r3Y.png"
              alt="Y Combinator Logo"
              width={24}
              height={24}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="outline" size="sm" className="justify-start bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create a Job
            </Button>
            <nav className="flex flex-col gap-0.5">
              <SideNavItem icon={<Bell className="h-3.5 w-3.5" />} label="Mentions & Notifications" />
              <SideNavItem icon={<Briefcase className="h-3.5 w-3.5" />} label="Jobs" active />
              <SideNavItem icon={<Users className="h-3.5 w-3.5" />} label="Talent pool" />
              <SideNavItem icon={<Settings className="h-3.5 w-3.5" />} label="Settings" />
            </nav>
          </div>
          <div className="mt-auto flex flex-col gap-0.5 pt-3">
            <SideNavItem icon={<Search className="h-3.5 w-3.5" />} label={<>Search <span className="ml-3 p-0.5 text-[10px] border rounded border-zinc-600">⌘K</span></>} />
            <SideNavItem icon={<CircleHelp className="h-3.5 w-3.5" />} label="Help & Support" />
            <SideNavItem icon={<UserPlus className="h-3.5 w-3.5" />} label="Invite people" />
            <div className="border-t border-zinc-800 my-1.5"></div>
            <div className="flex items-center gap-2 p-1.5">
              <Avatar className="h-6 w-6">
                <AvatarImage src="https://i.pravatar.cc/32?img=5" alt="Carlo Enchilada" />
                <AvatarFallback className="text-xs">CE</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-medium text-white">Carlo Enchilada</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="p-4 lg:p-5 relative bg-card">
          <Badge variant="secondary" className="absolute bottom-32 left-0 -rotate-90 origin-bottom-left -translate-x-1/2 ml-2 py-0.5 px-2 text-[10px] font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Founding Designer
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground mb-4">
            <span>Jobs</span>
            <ChevronRight className="h-3 w-3 mx-0.5" />
            <span>Senior Staff Engineer</span>
            <ChevronRight className="h-3 w-3 mx-0.5" />
            <span className="text-text-primary font-medium">Arsene Zidane</span>
          </div>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border">
                <AvatarImage src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/gKBqxHRaZsrwJn9Q3oIgL31Y5yA-1.jpeg" alt="Arsene Zidane" />
                <AvatarFallback>AZ</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold">Arsene Zidane</h1>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold px-1.5 py-0.5 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-0.5 text-green-600"/>
                    70% Match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">AI Architect @ Real Madrid</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <div className="flex items-center gap-0.5"><MapPin className="h-3 w-3" /><span>Madrid, Spain</span></div>
                  <div className="flex items-center gap-0.5"><Mail className="h-3 w-3" /><span>zidane@withrapha.com</span></div>
                  <a href="#" className="flex items-center gap-0.5 text-primary hover:underline"><LinkIcon className="h-3 w-3" /><span>Resume</span></a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Avatar className="h-6 w-6 border-2 border-white"><AvatarImage src="https://i.pravatar.cc/32?img=3" alt="User" /><AvatarFallback className="text-xs">U</AvatarFallback></Avatar>
                <p className="text-xs font-medium text-text-primary">You</p>
              </div>
              <p className="text-xs text-muted-foreground hidden xl:block">Owned by Massuf</p>
              <Select defaultValue="applied">
                <SelectTrigger className="w-[100px] bg-green-100 text-green-800 border-green-200 font-semibold text-xs h-7"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="applied">Applied</SelectItem><SelectItem value="screening">Screening</SelectItem><SelectItem value="interview">Interview</SelectItem></SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-7 w-7"><ChevronLeft className="h-3 w-3"/></Button>
              <Button variant="outline" size="icon" className="h-7 w-7"><ChevronRight className="h-3 w-3"/></Button>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-base font-semibold">Audio questions</h2>
            {audioQuestions.map(q => (
              <Card key={q.id} className="bg-white shadow-sm"><CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="rounded-full h-8 w-8 shrink-0"><Play className="h-3.5 w-3.5 fill-current"/></Button>
                      <div>
                          <p className="font-medium text-xs">{q.question}</p>
                          <p className="text-[11px] text-muted-foreground">{q.subtext}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="text-[11px]">{q.time} / {q.totalTime}</span>
                      <div className="flex items-center gap-1.5">
                          <button className="text-zinc-400 hover:text-zinc-600"><ThumbsUp className="h-4 w-4"/></button>
                          <button className="text-zinc-400 hover:text-zinc-600"><ThumbsDown className="h-4 w-4"/></button>
                      </div>
                  </div>
              </CardContent></Card>
            ))}
            <Card className="bg-white shadow-sm"><CardContent className="p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-text-primary">Summary:</span> Overall Arsene has built products for 12+ yrs in big name companies and startups. He's excited most about taking more ownership in his future roles. Primarily works on the frontend but is excited to jump into the backend if need be. Mentoring junior engineers became something he takes pride in.
              </p>
            </CardContent></Card>
          </div>
        </main>

        {/* Right Sidebar - Activity */}
        <aside className="p-3 lg:p-4 pt-4 lg:pt-5 bg-card border-l border-border hidden lg:block">
          <h2 className="text-base font-semibold mb-3">Activity</h2>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted h-8">
                <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                <TabsTrigger value="evaluation" className="text-xs">Evaluation</TabsTrigger>
                <TabsTrigger value="comments" className="text-xs">Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-3 space-y-4">
              {activityTimeline.map(item => (
                <div key={item.id} className="flex items-start gap-2.5">
                  <Avatar className="h-6 w-6"><AvatarImage src={item.user.avatar} alt={item.user.name} /><AvatarFallback className="text-xs">{item.user.name.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between text-[10px] mb-1">
                        <p className="font-semibold">{item.user.name} <span className="font-normal text-muted-foreground ml-1">{item.user.role}</span></p>
                        <p className="text-zinc-400">{item.timestamp}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2"><p className="text-xs text-text-primary/80">{item.comment}</p></div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </section>
  );
}