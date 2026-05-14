'use client'

import { useState, useTransition } from 'react'
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
import { createHorario } from './actions'

export type TurmaOption = { id: string; nome: string }

const DIA_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function AddHorarioDialog({ turmas }: { turmas: TurmaOption[] }) {
  const [open, setOpen] = useState(false)
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? '')
  const [dia, setDia] = useState('1')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim, setHoraFim] = useState('10:00')
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!turmaId) return
    startTransition(async () => {
      await createHorario(turmaId, Number(dia), horaInicio, horaFim)
      setOpen(false)
      setDia('1')
      setHoraInicio('08:00')
      setHoraFim('10:00')
    })
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
      >
        + Aula
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">Nova Aula</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Turma</Label>
              <Select value={turmaId} onValueChange={(v) => { if (v !== null) setTurmaId(v) }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50 w-full">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {turmas.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-zinc-50 focus:bg-zinc-700">
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Dia da semana</Label>
              <Select value={dia} onValueChange={(v) => { if (v !== null) setDia(v) }}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-50 w-full">
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

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !turmaId}>
              {isPending ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
