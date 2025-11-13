import Image from "next/image";

const ActivityCrmFeature = () => {
  return (
    <section className="bg-white pt-8 lg:pt-12 pb-16 lg:pb-20">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-start max-w-5xl mx-auto">
          {/* Activity is centralized Card */}
          <div className="flex flex-col">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="overflow-hidden rounded-lg">
                <Image
                  src="https://framerusercontent.com/images/Raujob7J5j2XWewQBIcoAOEj6T4.png"
                  alt="Activity is centralized feature mockup showing an activity timeline"
                  width={974}
                  height={428}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                Activity is centralized
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                Individually track all activity of your applicant's stages, comments, and evaluations in one place
              </p>
            </div>
          </div>

          {/* Built-in CRM Card */}
          <div className="flex flex-col">
            <div className="rounded-xl bg-white border border-gray-200 p-4 shadow-sm">
              <div className="overflow-hidden rounded-lg">
                <Image
                  src="https://framerusercontent.com/images/5SGrcz3VfKYAaeGosBGakXNOQRg.png"
                  alt="Built-in CRM feature mockup showing a candidate pipeline dashboard"
                  width={974}
                  height={428}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="mt-5">
              <h3 className="text-lg font-semibold text-[#6a994e] leading-tight">
                Built-in CRM
              </h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
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