import { Sparkles, UserCheck, UserX, Mail } from 'lucide-react';

const AiAssistantFeature = () => {
  return (
    <section className="bg-white pt-8 lg:pt-12 pb-8 lg:pb-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* Column 1: AI Assistant */}
          <div className="flex flex-col">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="space-y-2.5 text-gray-500 text-sm mb-4">
                <p className="leading-relaxed">What's a good technical audio question for react engineers</p>
                <p className="leading-relaxed">Write me a fun company description for tryfondo.com</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                <span className="text-sm text-gray-800 flex-1">
                  Create a software engineer job description
                </span>
                <button className="flex items-center gap-1.5 rounded-md bg-[#6a994e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#5a8a3e] transition-colors flex-shrink-0 ml-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate
                </button>
              </div>
              <div className="mt-3 text-gray-500 text-sm">
                <p className="leading-relaxed">Write me a tailored situational audio question</p>
              </div>
            </div>
            <div className="mt-5 text-left">
              <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                Ask TalentFlow and you shall receive
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                TalentFlow can assist with job descriptions, shortlisting applicants and any other back-office task.
              </p>
            </div>
          </div>

          {/* Column 2: Quick Commands */}
          <div className="flex flex-col">
            <div className="rounded-xl bg-[#2A2A2A] border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left mb-4">
                Actions for Diego Maradona
              </p>
              <div className="space-y-2.5 text-left">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">Move to phone screen</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-0.5 text-[10px] font-medium text-gray-300 font-mono">P</kbd>
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <UserX className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">Reject candidate</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-0.5 text-[10px] font-medium text-gray-300 font-mono">R</kbd>
                </div>
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm">Email candidate</span>
                  </div>
                  <kbd className="rounded bg-gray-700/80 px-2 py-0.5 text-[10px] font-medium text-gray-300 font-mono">E</kbd>
                </div>
              </div>
            </div>
            <div className="mt-5 text-left">
              <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                Quick commands to move fast
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Navigate your jobs, applicants, and all parts of TalentFlow without ever reaching for your mouse
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiAssistantFeature;