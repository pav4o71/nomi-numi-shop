import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/container";

/**
 * Global page-level loading skeleton.
 * Shown while Server Components are streaming.
 */
export default function Loading() {
  return (
    <main className="py-12 sm:py-16">
      <Container className="space-y-8">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Container>
    </main>
  );
}
