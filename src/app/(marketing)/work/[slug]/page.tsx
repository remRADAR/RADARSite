import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { caseStudies, getCaseStudy, getAdjacentCaseStudy } from "@/lib/case-studies";
import { getUnsplashPhoto, getUnsplashPhotos } from "@/lib/unsplash";
import { CaseHero } from "@/components/case-study/CaseHero";
import { CaseBrief } from "@/components/case-study/CaseBrief";
import { FullBleedMedia } from "@/components/case-study/FullBleedMedia";
import { ApproachSteps } from "@/components/case-study/ApproachSteps";
import { DetailGallery } from "@/components/case-study/DetailGallery";
import { ScrubVideo } from "@/components/case-study/ScrubVideo";
import { ResultsRow } from "@/components/case-study/ResultsRow";
import { CreditsBlock } from "@/components/case-study/CreditsBlock";
import { NextCaseTeaser } from "@/components/case-study/NextCaseTeaser";
import { StorySpine } from "@/components/case-study/StorySpine";

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

type CaseStudyPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getCaseStudy(slug);
  if (!project) return {};
  return { title: project.title, description: project.oneLiner };
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = getCaseStudy(slug);
  if (!project) notFound();

  const next = getAdjacentCaseStudy(slug);
  const breakTone = project.heroTone === "flare" ? "warm" : "flare";

  const [heroPhoto, breakPhoto, galleryPhotos, videoPhoto, nextPhoto] = await Promise.all([
    getUnsplashPhoto(project.heroImageQuery),
    getUnsplashPhoto(project.breakImageQuery),
    getUnsplashPhotos(project.gallery.map((g) => g.imageQuery)),
    project.hasVideoMoment ? getUnsplashPhoto(project.breakImageQuery) : Promise.resolve(null),
    getUnsplashPhoto(next.heroImageQuery),
  ]);

  return (
    <article className="lg:pl-8">
      <StorySpine targetSelector="[data-story-root]" />
      <div data-story-root>
        <CaseHero project={project} photo={heroPhoto} />
        <CaseBrief brief={project.brief} />
        <FullBleedMedia tone={breakTone} label={`${project.client} — detail`} photo={breakPhoto} />
        <ApproachSteps steps={project.approach} />
        <DetailGallery items={project.gallery} photos={galleryPhotos} />
        {project.hasVideoMoment && <ScrubVideo tone={project.heroTone} photo={videoPhoto} />}
        <ResultsRow results={project.results} />
        <CreditsBlock credits={project.credits} />
      </div>
      <NextCaseTeaser project={next} photo={nextPhoto} />
    </article>
  );
}
