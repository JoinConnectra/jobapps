import Image from "next/image";

const ActivityCrmFeature = () => {
  return (
    <section className="bg-[#FEFEFA] py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start max-w-6xl mx-auto">
          {/* Activity is centralized Card */}
          <div className="bg-card rounded-2xl p-6 lg:p-8 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div className="overflow-hidden rounded-lg">
              <Image
                src="https://framerusercontent.com/images/Raujob7J5j2XWewQBIcoAOEj6T4.png"
                alt="Activity is centralized feature mockup showing an activity timeline"
                width={974}
                height={428}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-body text-xl lg:text-2xl font-semibold text-[#6a994e]">
                Activity is centralized
              </h3>
              <p className="text-base lg:text-lg text-text-primary">
                Individually track all activity of your applicant's stages, comments, and evaluations in one place
              </p>
            </div>
          </div>

          {/* Built-in CRM Card */}
          <div className="bg-card rounded-2xl p-6 lg:p-8 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div className="overflow-hidden rounded-lg">
              <Image
                src="https://framerusercontent.com/images/5SGrcz3VfKYAaeGosBGakXNOQRg.png"
                alt="Built-in CRM feature mockup showing a candidate pipeline dashboard"
                width={974}
                height={428}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-body text-xl lg:text-2xl font-semibold text-[#6a994e]">
                Built-in CRM
              </h3>
              <p className="text-base lg:text-lg text-text-primary">
                Quickly glance over your pipeline with an easy to understand dashboard
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ActivityCrmFeature;