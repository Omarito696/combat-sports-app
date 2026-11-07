import { Swords } from 'lucide-react';

export default function EmptyState({ message = "No results found" }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Swords className="w-7 h-7 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}