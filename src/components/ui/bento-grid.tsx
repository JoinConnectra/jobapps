import { ComponentPropsWithoutRef, ReactNode } from "react"
import { ArrowRightIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AvatarCircles } from "@/components/ui/avatar-circles"

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode
  className?: string
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[18rem] md:auto-rows-[20rem] lg:auto-rows-[22rem] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // light styles
      "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "dark:bg-background transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-3 md:p-4">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="h-6 w-6 md:h-8 md:w-8 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />
        <div className="flex items-center gap-2 md:gap-3">
          <h3 className="font-display font-semibold text-[#1A1A1A] text-lg md:text-xl text-neutral-700 dark:text-neutral-300">
            {name}
          </h3>
          {name === "Team Collaboration" && (
            <div className="pointer-events-auto z-20">
              <AvatarCircles
                numPeople={99}
                avatarUrls={[
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/16860528",
                    profileUrl: "https://github.com/dillionverma",
                  },
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/20110627",
                    profileUrl: "https://github.com/tomonarifeehan",
                  },
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/106103625",
                    profileUrl: "https://github.com/BankkRoll",
                  },
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/59228569",
                    profileUrl: "https://github.com/safethecode",
                  },
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/59442788",
                    profileUrl: "https://github.com/sanjay-mali",
                  },
                  {
                    imageUrl: "https://avatars.githubusercontent.com/u/89768406",
                    profileUrl: "https://github.com/itsarghyadas",
                  },
                ]}
              />
            </div>
          )}
        </div>
        <p className="max-w-lg text-xs md:text-sm text-neutral-400">{description}</p>
      </div>

      <div
        className={cn(
          "pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:hidden"
        )}
      >
        <Button
          variant="link"
          asChild
          size="sm"
          className="pointer-events-auto p-0"
        >
          <a href={href}>
            {cta}
            <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
          </a>
        </Button>
      </div>
    </div>

      <div
        className={cn(
          "pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-3 md:p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
        )}
      >
      <Button
        variant="link"
        asChild
        size="sm"
        className="pointer-events-auto p-0"
      >
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
        </a>
      </Button>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </div>
)

export { BentoCard, BentoGrid }
