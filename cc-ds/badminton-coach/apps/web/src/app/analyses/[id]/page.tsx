import AnalysisView from "@/components/analysis/AnalysisView";

export default async function AnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-7xl px-5 pb-16 pt-4 sm:px-8 sm:pt-6">
      <AnalysisView id={id} />
    </div>
  );
}
