import Image from "next/image";

const ActivityCrmFeature = () => {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Activity is centralized Card */}
          <div className="bg-card rounded-2xl p-8 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div className="overflow-hidden rounded-lg">
              <Image
                src="https://framerusercontent.com/images/Raujob7J5j2XWewQBIcoAOEj6T4.png"
                alt="Activity is centralized feature mockup showing an activity timeline"
                width={974}
                height={428}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-body text-xl font-semibold text-primary">
                Activity is centralized
              </h3>
              <p className="text-base text-text-primary">
                Individually track all activity of your applicant’s stages, comments, and evaluations in one place
              </p>
            </div>
          </div>

          {/* Built-in CRM Card */}
          <div className="bg-card rounded-2xl p-8 flex flex-col gap-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            <div className="overflow-hidden rounded-lg">
              <Image
                src="https://framerusercontent.com/images/5SGrcz3VfKYAaeGosBGakXNOQRg.png"
                alt="Built-in CRM feature mockup showing a candidate pipeline dashboard"
                width={974}
                height={428}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-body text-xl font-semibold text-primary">
                Built-in CRM
              </h3>
              <p className="text-base text-text-primary">
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