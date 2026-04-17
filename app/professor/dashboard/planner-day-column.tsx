import { PlannerCard, type Slot } from './planner-card'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function PlannerDayColumn({
  dia,
  slots,
  isToday,
}: {
  dia: number
  slots: Slot[]
  isToday: boolean
}) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div
        className={`text-center text-xs font-semibold py-1 rounded-md ${
          isToday
            ? 'text-blue-400 ring-1 ring-blue-500/40 bg-blue-950/30'
            : 'text-zinc-500'
        }`}
      >
        {DAY_NAMES[dia]}
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-0.5">
        {slots.length === 0 ? (
          <div className="flex items-center justify-center h-10 text-zinc-700 text-sm select-none">
            —
          </div>
        ) : (
          slots.map((slot) => <PlannerCard key={slot.id} slot={slot} />)
        )}
      </div>
    </div>
  )
}
