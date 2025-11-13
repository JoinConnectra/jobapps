"use client";

import { useState, useEffect, useRef } from 'react';
import { User, ThumbsUp, Phone, Bell, CheckCircle, BookOpen, Video, Mail, LucideIcon } from 'lucide-react';

type TimelineCard = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  stage: "view" | "discuss" | "status" | "notify" | "hire";
  color: string;
  bgColor: string;
};

const timelineCards: TimelineCard[] = [
  {
    id: 1,
    title: "Viewing Applicant",
    description: "Reviewing candidate profile and responses",
    icon: User,
    stage: "view",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: 2,
    title: "Team Discussion",
    description: "Collaborative evaluation and feedback",
    icon: ThumbsUp,
    stage: "discuss",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: 3,
    title: "Move to Phone Screening",
    description: "Status updated to next stage",
    icon: Phone,
    stage: "status",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: 4,
    title: "Applicant Notified",
    description: "Automatic notification sent to candidate",
    icon: Bell,
    stage: "notify",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: 5,
    title: "Candidate Hired",
    description: "Successfully hired and onboarded",
    icon: CheckCircle,
    stage: "hire",
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
];

const firstMessage = "i really like this person";
const secondMessage = "seems good lets move him to phone screening";

export default function ActivityFeatureSection() {
  const [visibleStages, setVisibleStages] = useState<Set<string>>(new Set());
  const [displayedFeedback, setDisplayedFeedback] = useState('');
  const [displayedReply, setDisplayedReply] = useState('');
  const [currentStage, setCurrentStage] = useState<string>("");
  const [isVisible, setIsVisible] = useState(false);
  const [statusText, setStatusText] = useState("Move to Phone Screening");
  const [statusIcon, setStatusIcon] = useState<LucideIcon>(Phone);
  const [thumbsUpColor, setThumbsUpColor] = useState("text-gray-600");
  const [emailSent, setEmailSent] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const hoverTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const sectionRef = useRef<HTMLElement>(null);

  // Intersection Observer to detect when section is visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setCurrentStage("view");
            // Show all cards from the start, but faded
            setVisibleStages(new Set(["view", "discuss", "status", "notify", "hire"]));
            // Reset all animation states
            setStatusText("Move to Phone Screening");
            setStatusIcon(Phone);
            setThumbsUpColor("text-gray-600");
            setEmailSent(false);
            setDisplayedFeedback('');
            setDisplayedReply('');
            setAnimationComplete(false);
            setHoveredCard(null);
            // Clear hover timeouts
            hoverTimeoutsRef.current.forEach(clearTimeout);
            hoverTimeoutsRef.current = [];
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  // Timeline progression logic
  useEffect(() => {
    if (!isVisible) return;

    const stages = ["view", "discuss", "status", "notify", "hire"];
    let stageIndex = stages.indexOf(currentStage);
    if (stageIndex === -1) stageIndex = 0;

    const timeouts: NodeJS.Timeout[] = [];

    // Stage 1: View applicant (immediate)
    if (currentStage === "view") {
      timeouts.push(setTimeout(() => {
        setCurrentStage("discuss");
        // Keep all cards visible
        setVisibleStages(new Set(["view", "discuss", "status", "notify", "hire"]));
      }, 1000));
    }

    // Stage 2: Team discussion (with typing animation)
    if (currentStage === "discuss") {
      // Animate thumbs up to green
      timeouts.push(setTimeout(() => {
        setThumbsUpColor("text-green-600");
      }, 500));
      
      // Start typing first message
      let charIndex = 0;
      const typeFirst = () => {
        if (charIndex < firstMessage.length) {
          setDisplayedFeedback(firstMessage.slice(0, charIndex + 1));
          charIndex++;
          timeouts.push(setTimeout(typeFirst, 40));
        } else {
          // Wait then show second message (faster transition)
          timeouts.push(setTimeout(() => {
            let replyIndex = 0;
            const typeSecond = () => {
              if (replyIndex < secondMessage.length) {
                setDisplayedReply(secondMessage.slice(0, replyIndex + 1));
                replyIndex++;
                timeouts.push(setTimeout(typeSecond, 40));
              } else {
                // Move to next stage after conversation completes
                timeouts.push(setTimeout(() => {
                  setCurrentStage("status");
                  // Keep all cards visible
                  setVisibleStages(new Set(["view", "discuss", "status", "notify", "hire"]));
                }, 1500));
              }
            };
            typeSecond();
          }, 500));
        }
      };
      typeFirst();
    }

    // Stage 3: Status change (with text and icon animations)
    if (currentStage === "status") {
      const initialText = "Move to Phone Screening";
      const assessmentText = "Move to Assessment";
      const interviewText = "Moving to Interview";
      
      // First: Untype "Phone Screening" part
      let untypeIndex = initialText.length;
      const untypeToAssessment = () => {
        if (untypeIndex > "Move to ".length) {
          setStatusText(initialText.slice(0, untypeIndex - 1));
          untypeIndex--;
          timeouts.push(setTimeout(untypeToAssessment, 30));
        } else {
          // Start typing "Assessment"
          let typeIndex = "Move to ".length;
          const typeAssessment = () => {
            if (typeIndex < assessmentText.length) {
              setStatusText(assessmentText.slice(0, typeIndex + 1));
              typeIndex++;
              timeouts.push(setTimeout(typeAssessment, 30));
            } else {
              // Change icon after text is complete
              setStatusIcon(BookOpen);
              // Wait then untype "Assessment"
              timeouts.push(setTimeout(() => {
                let untypeIndex2 = assessmentText.length;
                const untypeToInterview = () => {
                  if (untypeIndex2 > "Move to ".length) {
                    setStatusText(assessmentText.slice(0, untypeIndex2 - 1));
                    untypeIndex2--;
                    timeouts.push(setTimeout(untypeToInterview, 30));
                  } else {
                    // Start typing "Interview"
                    let typeIndex2 = "Move to ".length;
                    const typeInterview = () => {
                      if (typeIndex2 < interviewText.length) {
                        setStatusText(interviewText.slice(0, typeIndex2 + 1));
                        typeIndex2++;
                        timeouts.push(setTimeout(typeInterview, 30));
                      } else {
                        // Change icon after text is complete
                        setStatusIcon(Video);
                        // Move to next stage
                        timeouts.push(setTimeout(() => {
                          setCurrentStage("notify");
                          setVisibleStages(new Set(["view", "discuss", "status", "notify", "hire"]));
                        }, 500));
                      }
                    };
                    typeInterview();
                  }
                };
                untypeToInterview();
              }, 1000));
            }
          };
          typeAssessment();
        }
      };
      untypeToAssessment();
    }

    // Stage 4: Notification (with email sending animation)
    if (currentStage === "notify") {
      // Trigger email sending animation
      timeouts.push(setTimeout(() => {
        setEmailSent(true);
      }, 500));
      
      // Move to next stage
      timeouts.push(setTimeout(() => {
        setCurrentStage("hire");
        // Keep all cards visible
        setVisibleStages(new Set(["view", "discuss", "status", "notify", "hire"]));
      }, 2500));
    }

    // Stage 5: Hire - mark animation as complete
    if (currentStage === "hire") {
      timeouts.push(setTimeout(() => {
        setAnimationComplete(true);
      }, 1000));
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [currentStage, isVisible]);

  // Hover animation functions
  const playViewAnimation = () => {
    // Loading animation is shown via isActive state
    // No additional state needed for view card
  };

  const playDiscussAnimation = () => {
    // Clear existing timeouts
    hoverTimeoutsRef.current.forEach(clearTimeout);
    hoverTimeoutsRef.current = [];
    
    // Reset states
    setThumbsUpColor("text-gray-600");
    setDisplayedFeedback('');
    setDisplayedReply('');
    
    // Animate thumbs up to green
    hoverTimeoutsRef.current.push(setTimeout(() => {
      setThumbsUpColor("text-green-600");
    }, 300));
    
    // Start typing first message
    let charIndex = 0;
    const typeFirst = () => {
      if (charIndex < firstMessage.length) {
        setDisplayedFeedback(firstMessage.slice(0, charIndex + 1));
        charIndex++;
        hoverTimeoutsRef.current.push(setTimeout(typeFirst, 40));
      } else {
        // Wait then show second message
        hoverTimeoutsRef.current.push(setTimeout(() => {
          let replyIndex = 0;
          const typeSecond = () => {
            if (replyIndex < secondMessage.length) {
              setDisplayedReply(secondMessage.slice(0, replyIndex + 1));
              replyIndex++;
              hoverTimeoutsRef.current.push(setTimeout(typeSecond, 40));
            }
          };
          typeSecond();
        }, 500));
      }
    };
    typeFirst();
  };

  const playStatusAnimation = () => {
    // Clear existing timeouts
    hoverTimeoutsRef.current.forEach(clearTimeout);
    hoverTimeoutsRef.current = [];
    
    // Reset to initial state
    setStatusText("Move to Phone Screening");
    setStatusIcon(Phone);
    
    const initialText = "Move to Phone Screening";
    const assessmentText = "Move to Assessment";
    const interviewText = "Moving to Interview";
    
    // First: Untype "Phone Screening" part
    let untypeIndex = initialText.length;
    const untypeToAssessment = () => {
      if (untypeIndex > "Move to ".length) {
        setStatusText(initialText.slice(0, untypeIndex - 1));
        untypeIndex--;
        hoverTimeoutsRef.current.push(setTimeout(untypeToAssessment, 30));
      } else {
        // Start typing "Assessment"
        let typeIndex = "Move to ".length;
        const typeAssessment = () => {
          if (typeIndex < assessmentText.length) {
            setStatusText(assessmentText.slice(0, typeIndex + 1));
            typeIndex++;
            hoverTimeoutsRef.current.push(setTimeout(typeAssessment, 30));
          } else {
            // Change icon after text is complete
            setStatusIcon(BookOpen);
            // Wait then untype "Assessment"
            hoverTimeoutsRef.current.push(setTimeout(() => {
              let untypeIndex2 = assessmentText.length;
              const untypeToInterview = () => {
                if (untypeIndex2 > "Move to ".length) {
                  setStatusText(assessmentText.slice(0, untypeIndex2 - 1));
                  untypeIndex2--;
                  hoverTimeoutsRef.current.push(setTimeout(untypeToInterview, 30));
                } else {
                  // Start typing "Interview"
                  let typeIndex2 = "Move to ".length;
                  const typeInterview = () => {
                    if (typeIndex2 < interviewText.length) {
                      setStatusText(interviewText.slice(0, typeIndex2 + 1));
                      typeIndex2++;
                      hoverTimeoutsRef.current.push(setTimeout(typeInterview, 30));
                    } else {
                      // Change icon after text is complete
                      setStatusIcon(Video);
                    }
                  };
                  typeInterview();
                }
              };
              untypeToInterview();
            }, 1000));
          }
        };
        typeAssessment();
      }
    };
    untypeToAssessment();
  };

  const playNotifyAnimation = () => {
    // Clear existing timeouts
    hoverTimeoutsRef.current.forEach(clearTimeout);
    hoverTimeoutsRef.current = [];
    
    // Reset state
    setEmailSent(false);
    
    // Trigger email sending animation
    hoverTimeoutsRef.current.push(setTimeout(() => {
      setEmailSent(true);
    }, 500));
  };

  const handleCardHover = (stage: string) => {
    if (!animationComplete) return;
    
    setHoveredCard(stage);
    
    // Clear any existing hover timeouts
    hoverTimeoutsRef.current.forEach(clearTimeout);
    hoverTimeoutsRef.current = [];
    
    // Play the specific animation
    switch (stage) {
      case "view":
        playViewAnimation();
        break;
      case "discuss":
        playDiscussAnimation();
        break;
      case "status":
        playStatusAnimation();
        break;
      case "notify":
        playNotifyAnimation();
        break;
      case "hire":
        // No animation for hire card
        break;
    }
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
    // Clear hover timeouts
    hoverTimeoutsRef.current.forEach(clearTimeout);
    hoverTimeoutsRef.current = [];
  };

  return (
    <section ref={sectionRef} className="relative bg-white py-16 md:py-20 lg:py-24 overflow-hidden">
      <div className="container relative z-10 mx-auto px-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* Left side - Headline and description */}
          <div className="flex flex-col">
            <h2 className="font-display font-bold text-[#1A1A1A] text-3xl md:text-4xl lg:text-5xl leading-[1.1] tracking-[-0.02em] mb-4">
              Streamline your hiring process from start to finish
            </h2>
            <p className="text-sm md:text-base text-[#666666] leading-relaxed">
              TalentFlow Activity enables seamless collaboration throughout the entire recruitment journey. From initial candidate review to team discussions, status updates, automatic notifications, and final hiring decisions—all tracked in one unified timeline.
            </p>
          </div>

          {/* Right side - Timeline cards */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-2">
              {timelineCards.map((card, index) => {
                // Use dynamic icon for status card - ensure it's always initialized
                const Icon = card.stage === "status" ? (statusIcon || Phone) : card.icon;
                const isVisible = visibleStages.has(card.stage);
                const isActive = currentStage === card.stage;
                const isHovered = hoveredCard === card.stage;
                // During animation: show only active card. After completion: show only hovered card (or hire card if nothing hovered)
                const shouldShowAnimation = animationComplete 
                  ? (isHovered || (!hoveredCard && card.stage === "hire"))
                  : isActive;
                
                // Use dynamic color for thumbs up icon
                const iconColor = card.stage === "discuss" && shouldShowAnimation 
                  ? thumbsUpColor 
                  : shouldShowAnimation 
                  ? 'text-[#6a994e]' 
                  : isVisible 
                  ? 'text-gray-500' 
                  : 'text-gray-400';
                // Use dynamic title for status card
                const cardTitle = card.stage === "status" ? (statusText || "Move to Phone Screening") : card.title;
                
                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => handleCardHover(card.stage)}
                    onMouseLeave={handleCardLeave}
                    className={`
                      relative rounded-lg border transition-all duration-500
                      ${shouldShowAnimation
                        ? 'bg-[#6a994e]/10 border-[#6a994e]/30 shadow-md opacity-100' 
                        : isVisible
                        ? 'bg-white border-gray-200/60 opacity-50' 
                        : 'bg-white border-gray-200/40 opacity-30'
                      }
                      ${animationComplete ? 'cursor-pointer hover:bg-[#6a994e]/10 hover:border-[#6a994e]/30 hover:shadow-md hover:opacity-100' : ''}
                      p-3.5
                    `}
                  >
                    {/* Header with icon and title */}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`
                          p-1 rounded transition-colors duration-500
                          ${shouldShowAnimation ? 'bg-[#6a994e]/20' : isVisible ? 'bg-gray-50' : 'bg-gray-100/60'}
                        `}>
                          <Icon className={`
                            w-3 h-3 transition-colors duration-500
                            ${iconColor}
                          `} />
                        </div>
                        <div>
                          <h3 className={`
                            font-semibold text-xs leading-tight transition-all duration-300
                            ${shouldShowAnimation ? 'text-[#1A1A1A]' : isVisible ? 'text-gray-600' : 'text-gray-400'}
                          `}>
                            {cardTitle}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`
                      text-[10px] leading-relaxed mb-0
                      ${shouldShowAnimation ? 'text-gray-700' : isVisible ? 'text-gray-500' : 'text-gray-400'}
                    `}>
                      {card.description}
                    </p>

                    {/* Loading animation for viewing applicant stage */}
                    {card.stage === "view" && shouldShowAnimation && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 items-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-400 loading-dot"></div>
                          </div>
                          <span className="text-[9px] text-gray-500">Loading profile...</span>
                        </div>
                      </div>
                    )}

                    {/* Team discussion content for discuss stage */}
                    {card.stage === "discuss" && (visibleStages.has("discuss") || isHovered) && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50 space-y-2">
                        {/* First comment - Ahmed Khan */}
                        {displayedFeedback && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-[9px] text-white font-semibold">AK</span>
                              </div>
                              <span className="text-[9px] text-gray-600">Ahmed Khan</span>
                            </div>
                            <div className="text-[9px] text-gray-500 italic pl-5">
                              "{displayedFeedback}
                              {(currentStage === "discuss" || isHovered) && displayedFeedback.length < firstMessage.length && (
                                <span className="inline-block w-0.5 h-2.5 bg-[#6a994e] ml-0.5 animate-pulse align-middle" />
                              )}
                              "
                            </div>
                          </div>
                        )}

                        {/* Second comment - Reply from another team member */}
                        {displayedReply && (
                          <div className="space-y-1 pt-1 border-t border-gray-200/30">
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded bg-green-600 flex items-center justify-center flex-shrink-0">
                                <span className="text-[9px] text-white font-semibold">FS</span>
                              </div>
                              <span className="text-[9px] text-gray-600">Fatima Sheikh</span>
                            </div>
                            <div className="text-[9px] text-gray-500 italic pl-5">
                              "{displayedReply}
                              {(currentStage === "discuss" || isHovered) && displayedReply.length < secondMessage.length && (
                                <span className="inline-block w-0.5 h-2.5 bg-[#6a994e] ml-0.5 animate-pulse align-middle" />
                              )}
                              "
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email sending animation for notify stage */}
                    {card.stage === "notify" && shouldShowAnimation && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <div className="flex items-center gap-2">
                          {emailSent ? (
                            <>
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              <span className="text-[9px] text-gray-600">Email notification sent</span>
                            </>
                          ) : (
                            <>
                              <div className="relative">
                                <Mail className="w-3 h-3 text-gray-500 animate-pulse" />
                                <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#6a994e] rounded-full animate-ping"></div>
                              </div>
                              <span className="text-[9px] text-gray-500">Sending email...</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Success indicator for hire stage */}
                    {card.stage === "hire" && shouldShowAnimation && (
                      <div className="mt-2 pt-2 border-t border-gray-200/50">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
                          <span className="text-[9px] text-gray-600">Offer accepted • Onboarding started</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
