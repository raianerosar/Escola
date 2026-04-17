import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type Slot = {
  id: string
  turma: string
  curso: string
  horaInicio: string // "08:00:00"
  horaFim: string   // "10:00:00"
}

function formatTime(time: string): string {
  // "08:00:00" → "08:00"
  return time.slice(0, 5)
}

export function PlannerCard({ slot }: { slot: Slot }) {
  return (
    <Card className="bg-zinc-800 border-zinc-700 shadow-none">
      <CardContent className="p-3 space-y-1">
        <p className="text-zinc-100 font-medium text-sm leading-tight">{slot.turma}</p>
        <p className="text-zinc-500 text-xs">{slot.curso}</p>
        <Badge
          variant="outline"
          className="text-zinc-400 border-zinc-600 text-[10px] px-1.5 py-0 h-4 mt-1"
        >
          {formatTime(slot.horaInicio)} – {formatTime(slot.horaFim)}
        </Badge>
      </CardContent>
    </Card>
  )
}
