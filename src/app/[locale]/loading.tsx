import { LoadingSwing } from "@/components/LoadingSwing";

// Segment-level suspense fallback: every route under [locale] shows the swing
// animation while its server components fetch data.
export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <LoadingSwing />
    </div>
  );
}
