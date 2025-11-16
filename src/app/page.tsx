import HeaderNavigation from '@/components/sections/header-navigation';
import HeroSection from '@/components/sections/hero-section';
import ApplicantShowcaseSection from '@/components/sections/applicant-showcase-section';
import AnimatedSearchSection from '@/components/sections/animated-search-section';
import ActivityFeatureSection from '@/components/sections/activity-feature-section';
import FeaturesOverviewSection from '@/components/sections/features-overview-section';
import AiAssistantFeature from '@/components/sections/ai-assistant-feature';
import ActivityCrmFeature from '@/components/sections/activity-crm-feature';
import GlobalTeamSection from '@/components/sections/global-team-section';
import TestimonialsSection from '@/components/sections/testimonials-section';
import FinalCtaSection from '@/components/sections/final-cta-section';
import Footer from '@/components/sections/footer';

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <HeaderNavigation />
      <HeroSection />
      <ApplicantShowcaseSection />
      <AnimatedSearchSection />
      <ActivityFeatureSection />
      {/* <FeaturesOverviewSection /> */}
      {/* <AiAssistantFeature /> */}
      {/* <ActivityCrmFeature /> */}
      {/* <GlobalTeamSection /> */}
      {/* <TestimonialsSection /> */}
      <FinalCtaSection />
      <Footer />
    </main>
  );
}