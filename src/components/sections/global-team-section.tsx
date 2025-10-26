import Image from "next/image";
import Link from "next/link";

const avatars = [
  {
    src: "https://framerusercontent.com/images/DwNeJtsZOLLPektKpU4HMXqueg.jpeg",
    alt: "Team member in North America",
    position: "top-[25%] left-[15%]",
  },
  {
    src: "https://framerusercontent.com/images/ibuzm113T5f7h76WnbcYdBKJTk.jpeg",
    alt: "Team member in South America",
    position: "top-[65%] left-[22%]",
  },
  {
    src: "https://framerusercontent.com/images/uvXF6PdQifwD8Rdkjm13mIMbq4.jpeg",
    alt: "Team member in Europe",
    position: "top-[45%] left-1/2 -translate-x-1/2",
  },
  {
    src: "https://framerusercontent.com/images/S2a4J2MW9cfxDbmmJYcy0BRAdE.jpeg",
    alt: "Team member in Asia",
    position: "top-[25%] right-[20%]",
  },
  {
    src: "https://framerusercontent.com/images/DwNeJtsZOLLPektKpU4HMXqueg.jpeg",
    alt: "Team member in Oceania",
    position: "top-[65%] right-[30%]",
  },
];

const GlobalTeamSection = () => {
  return (
    <section className="w-full bg-background py-24">
      <div className="container mx-auto flex flex-col items-center justify-center px-6 text-center md:px-12">
        <Link
          href="https://app.withrapha.com/"
          className="mb-4 inline-block rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Hire globally
        </Link>
        <h2 className="font-display mb-12 max-w-4xl text-5xl font-bold text-foreground">
          TalentFlow is designed for distributed teams
        </h2>

        <div className="relative mx-auto mb-8 w-full max-w-[1000px] aspect-[2/1]">
          <Image
            src="https://framerusercontent.com/images/tFbev406F6DwSs6fXEjhJ60PTqU.png"
            alt="Dotted world map"
            layout="fill"
            objectFit="contain"
            className="opacity-40"
          />

          {avatars.map((avatar, index) => (
            <div
              key={index}
              className={`absolute h-[60px] w-[60px] rounded-full border-[3px] border-white shadow-lg ${avatar.position}`}
            >
              <Image
                src={avatar.src}
                alt={avatar.alt}
                width={60}
                height={60}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
          ))}
        </div>

        <p className="text-[1.125rem] leading-relaxed text-muted-foreground">
          TalentFlow supports global hiring and multi-languages
        </p>
      </div>
    </section>
  );
};

export default GlobalTeamSection;