'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateHorario, deleteHorario } from './actions'

export type Slot = {
  id: string
  turmaId: string
  dia: number
  turma: string
  curso: string
  horaInicio: string // "08:00:00"
  horaFim: string   // "10:00:00"
}

const DIA_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function PlannerCard({ slot }: { slot: Slot }) {
  const [open, setOpen] = useState(false)
  const [dia, setDia] = useState(String(slot.dia))
  const [horaInicio, setHoraInicio] = useState(formatTime(slot.horaInicio))
  const [horaFim, setHoraFim] = useState(formatTime(slot.horaFim))
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      await updateHorario(slot.id, slot.turmaId, Number(dia), horaInicio, horaFim)
      setOpen(false)
    })
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteHorario(slot.id, slot.turmaId)
      setOpen(false)
    })
  }

  return (
    <>
      <Card
        className="bg-zinc-800 border-zinc-700 shadow-none cursor-pointer hover:border-zinc-500 transition-colors"
        onClick={() => setOpen(true)}
        role="button"
        aria-label={`Editar aula ${slot.turma} ${formatTime(slot.horaInicio)}–${formatTime(slot.horaFim)}`}
      >
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">{slot.turma}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Dia da semana</Label>
              <Select value={dia} onValueChange={(v) => { if (v !== null) setDia(v) }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {DIA_NAMES.map((nome, i) => (
                    <SelectItem key={i} value={String(i)} className="text-zinc-50 focus:bg-zinc-700">
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Início</Label>
                <Input
                  type="time"
                  value={horaInicio}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraInicio(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs">Fim</Label>
                <Input
                  type="time"
                  value={horaFim}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHoraFim(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-50"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="sm:mr-auto"
            >
              Remover aula
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
