import HeaderNavigation from '@/components/sections/header-navigation';
import HeroSection from '@/components/sections/hero-section';
import CandidateProfileShowcase from '@/components/sections/candidate-profile-showcase';
import CompanyLogosSection from '@/components/sections/company-logos-section';
import FeaturesOverviewSection from '@/components/sections/features-overview-section';
import AiAssistantFeature from '@/components/sections/ai-assistant-feature';
import ActivityCrmFeature from '@/components/sections/activity-crm-feature';
import GlobalTeamSection from '@/components/sections/global-team-section';
import TestimonialsSection from '@/components/sections/testimonials-section';
import FinalCtaSection from '@/components/sections/final-cta-section';
import Footer from '@/components/sections/footer';

export default function Page() {
  return (
    <main className="min-h-screen bg-[#FEFEFA]">
      <HeaderNavigation />
      <HeroSection />
      <CandidateProfileShowcase />
      <CompanyLogosSection />
      <FeaturesOverviewSection />
      <AiAssistantFeature />
      <ActivityCrmFeature />
      <GlobalTeamSection />
      <TestimonialsSection />
      <FinalCtaSection />
      <Footer />
    </main>
  );
}