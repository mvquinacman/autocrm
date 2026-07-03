import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          {title} is coming in a future milestone.
        </CardContent>
      </Card>
    </div>
  );
}
