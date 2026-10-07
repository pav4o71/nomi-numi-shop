import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/container";

export default function CollectionsLoading() {
  return (
    <main className="section-shell py-12 sm:py-16">
      <Container className="space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </Container>
    </main>
  );
}
