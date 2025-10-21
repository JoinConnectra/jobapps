import { Sparkles, UserCheck, UserX, Mail } from 'lucide-react';

const AiAssistantFeature = () => {
  return (
    <section className="py-20 lg:py-24">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Column 1: AI Assistant */}
          <div className="flex flex-col">
            <div className="bg-card rounded-2xl p-8 border border-border w-full">
              <div className="space-y-4 text-muted-foreground/80 text-sm">
                <p>What's a good technical audio question for react engineers</p>
                <p>Write me a fun company description for tryfondo.com</p>
              </div>
              <div className="mt-6 flex items-center justify-between rounded-lg border border-input bg-white p-2">
                <span className="text-sm text-foreground ml-2">
                  Create a software engineer job description
                </span>
                <button className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                  <Sparkles className="h-4 w-4" />
                  Generate
                </button>
              </div>
              <div className="mt-4 text-muted-foreground/80 text-sm">
                <p>Write me a tailored situational audio question</p>
              </div>
            </div>
            <div className="mt-8 text-left">
              <h3 className="text-[1.75rem] font-semibold text-[#4169E1] leading-tight">
                Ask Rapha and you shall receive
              </h3>
              <p className="mt-4 text-muted-foreground text-lg">
                Rapha can assist with job descriptions, shortlisting applicants and any other back-office task.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Commands */}
          <div className="flex flex-col">
            <div className="rounded-2xl bg-[#2A2A2A] p-8 w-full">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-left">
                Actions for Diego Maradona
              </p>
              <div className="mt-6 space-y-4 text-left">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Move to phone screen</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-1 text-xs font-medium text-gray-300 font-mono">P</kbd>
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <UserX className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Reject candidate</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-1 text-xs font-medium text-gray-300 font-mono">R</kbd>
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Email candidate</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-1 text-xs font-medium text-gray-300 font-mono">E</kbd>
                </div>
              </div>
            </div>
            <div className="mt-8 text-left">
              <h3 className="text-[1.75rem] font-semibold text-[#4169E1] leading-tight">
                Quick commands to move fast
              </h3>
              <p className="mt-4 text-muted-foreground text-lg">
                Navigate your jobs, applicants, and all parts of Rapha without ever reaching for your mouse
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantFeature;