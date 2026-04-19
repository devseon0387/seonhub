import { notFound } from 'next/navigation';
import WireframesGallery from '@/components/WireframesGallery';
import { WIREFRAMES } from '@/wireframes/registry';

export async function generateStaticParams() {
  return WIREFRAMES.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = WIREFRAMES.find((w) => w.slug === slug);
  return {
    title: entry ? `${entry.title} 와이어프레임 | SEON Hub` : '와이어프레임',
  };
}

export default async function WireframeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!WIREFRAMES.find((w) => w.slug === slug)) notFound();
  return <WireframesGallery initialSlug={slug} />;
}
