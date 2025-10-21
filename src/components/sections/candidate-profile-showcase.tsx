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
    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
    <section className="w-full bg-[#FFF9F1] font-body text-text-primary py-12 px-4 md:px-8">
      <div className="grid w-full max-w-[1400px] mx-auto grid-cols-[240px_1fr_380px] rounded-xl shadow-2xl overflow-hidden border border-border">
        {/* Left Sidebar */}
        <aside className="bg-[#1e1e1e] text-white flex flex-col p-4">
          <div className="mb-8">
            <Image
              src="https://framerusercontent.com/images/3fTRzVqDE2tYJAm3vxT2cW0r3Y.png"
              alt="Y Combinator Logo"
              width={32}
              height={32}
            />
          </div>
          <div className="flex flex-col gap-4">
            <Button variant="outline" className="justify-start bg-transparent border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              <Plus className="mr-2 h-4 w-4" /> Create a Job
            </Button>
            <nav className="flex flex-col gap-1">
              <SideNavItem icon={<Bell className="h-4 w-4" />} label="Mentions & Notifications" />
              <SideNavItem icon={<Briefcase className="h-4 w-4" />} label="Jobs" active />
              <SideNavItem icon={<Users className="h-4 w-4" />} label="Talent pool" />
              <SideNavItem icon={<Settings className="h-4 w-4" />} label="Settings" />
            </nav>
          </div>
          <div className="mt-auto flex flex-col gap-1 pt-4">
            <SideNavItem icon={<Search className="h-4 w-4" />} label={<>Search <span className="ml-4 p-1 text-xs border rounded border-zinc-600">⌘K</span></>} />
            <SideNavItem icon={<CircleHelp className="h-4 w-4" />} label="Help & Support" />
            <SideNavItem icon={<UserPlus className="h-4 w-4" />} label="Invite people" />
            <div className="border-t border-zinc-800 my-2"></div>
            <div className="flex items-center gap-2 p-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://i.pravatar.cc/32?img=5" alt="Carlo Enchilada" />
                <AvatarFallback>CE</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <p className="font-medium text-white">Carlo Enchilada</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="p-8 relative bg-card">
          <Badge variant="secondary" className="absolute bottom-40 left-0 -rotate-90 origin-bottom-left -translate-x-1/2 ml-3 py-1 px-4 text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Founding Designer
          </Badge>
          <div className="flex items-center text-sm text-muted-foreground mb-6">
            <span>Jobs</span>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>Senior Staff Engineer</span>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-text-primary font-medium">Arsene Zidane</span>
          </div>
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/a8a1e1ed-e161-41df-b141-ad3ac910310b-withrapha-com/assets/icons/gKBqxHRaZsrwJn9Q3oIgL31Y5yA-1.jpeg" alt="Arsene Zidane" />
                <AvatarFallback>AZ</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">Arsene Zidane</h1>
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-semibold px-2 py-1">
                    <CheckCircle2 className="h-4 w-4 mr-1 text-green-600"/>
                    70% Match
                  </Badge>
                </div>
                <p className="text-muted-foreground">AI Architect @ Real Madrid</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <div className="flex items-center gap-1"><MapPin className="h-4 w-4" /><span>Madrid, Spain</span></div>
                  <div className="flex items-center gap-1"><Mail className="h-4 w-4" /><span>zidane@withrapha.com</span></div>
                  <a href="#" className="flex items-center gap-1 text-primary hover:underline"><LinkIcon className="h-4 w-4" /><span>Resume</span></a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8 border-2 border-white"><AvatarImage src="https://i.pravatar.cc/32?img=3" alt="User" /><AvatarFallback>U</AvatarFallback></Avatar>
                <p className="text-sm font-medium text-text-primary">You</p>
              </div>
              <p className="text-sm text-muted-foreground">Owned by Massuf Andestani</p>
              <Select defaultValue="applied">
                <SelectTrigger className="w-[120px] bg-green-100 text-green-800 border-green-200 font-semibold"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="applied">Applied</SelectItem><SelectItem value="screening">Screening</SelectItem><SelectItem value="interview">Interview</SelectItem></SelectContent>
              </Select>
              <Button variant="outline"><ChevronLeft className="h-4 w-4"/></Button>
              <Button variant="outline"><ChevronRight className="h-4 w-4"/></Button>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Audio questions</h2>
            {audioQuestions.map(q => (
              <Card key={q.id} className="bg-white shadow-sm"><CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0"><Play className="h-4 w-4 fill-current"/></Button>
                      <div>
                          <p className="font-medium text-sm">{q.question}</p>
                          <p className="text-xs text-muted-foreground">{q.subtext}</p>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{q.time} / {q.totalTime}</span>
                      <div className="flex items-center gap-2">
                          <button className="text-zinc-400 hover:text-zinc-600"><ThumbsUp className="h-5 w-5"/></button>
                          <button className="text-zinc-400 hover:text-zinc-600"><ThumbsDown className="h-5 w-5"/></button>
                      </div>
                  </div>
              </CardContent></Card>
            ))}
            <Card className="bg-white shadow-sm"><CardContent className="p-4 flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-1"/>
              <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-text-primary">Summary:</span> Overall Arsene has built products for 12+ yrs in big name companies and startups. He’s excited most about taking more ownership in his future roles. Primarily works on the frontend but is excited to jump into the backend if need be. Mentoring junior engineers became something he takes pride in.
              </p>
            </CardContent></Card>
          </div>
        </main>

        {/* Right Sidebar - Activity */}
        <aside className="p-6 pt-8 bg-card border-l border-border">
          <h2 className="text-lg font-semibold mb-4">Activity</h2>
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="mt-4 space-y-6">
              {activityTimeline.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8"><AvatarImage src={item.user.avatar} alt={item.user.name} /><AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback></Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between text-xs mb-1">
                        <p className="font-semibold">{item.user.name} <span className="font-normal text-muted-foreground ml-1">{item.user.role}</span></p>
                        <p className="text-zinc-400">{item.timestamp}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3"><p className="text-sm text-text-primary/80">{item.comment}</p></div>
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