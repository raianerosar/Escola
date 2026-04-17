'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
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
import { updateHorario, deleteHorario, getAulaNota, upsertAulaNota, getAlunosDaTurma, type AlunoInfo } from './actions'

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

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function PlannerCard({ slot }: { slot: Slot }) {
  const [open, setOpen] = useState(false)
  const [dia, setDia] = useState(String(slot.dia))
  const [horaInicio, setHoraInicio] = useState(formatTime(slot.horaInicio))
  const [horaFim, setHoraFim] = useState(formatTime(slot.horaFim))
  const [isPending, startTransition] = useTransition()

  const [notaData, setNotaData] = useState(todayStr())
  const [notas, setNotas] = useState('')
  const [notaLoading, setNotaLoading] = useState(false)
  const [alunos, setAlunos] = useState<AlunoInfo[]>([])
  const [alunosLoaded, setAlunosLoaded] = useState(false)

  async function loadNota(data: string) {
    setNotaLoading(true)
    const texto = await getAulaNota(slot.id, data)
    setNotas(texto)
    setNotaLoading(false)
  }

  async function handleNotaDataChange(nova: string) {
    setNotaData(nova)
    await loadNota(nova)
  }

  function handleSaveNota() {
    startTransition(async () => {
      await upsertAulaNota(slot.id, notaData, notas)
    })
  }

  async function loadAlunos() {
    if (alunosLoaded) return
    const lista = await getAlunosDaTurma(slot.turmaId)
    setAlunos(lista)
    setAlunosLoaded(true)
  }

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
        aria-label={`Abrir aula ${slot.turma} ${formatTime(slot.horaInicio)}–${formatTime(slot.horaFim)}`}
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

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (v) {
            const today = todayStr()
            setNotaData(today)
            setAlunosLoaded(false)
            loadNota(today)
          }
        }}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-50">{slot.turma}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="horario" className="mt-2">
            <TabsList className="bg-zinc-800 border border-zinc-700 w-full">
              <TabsTrigger
                value="horario"
                className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700"
              >
                Horário
              </TabsTrigger>
              <TabsTrigger
                value="anotacoes"
                className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700"
              >
                Anotações
              </TabsTrigger>
              <TabsTrigger
                value="alunos"
                className="flex-1 text-zinc-400 data-[state=active]:text-zinc-50 data-[state=active]:bg-zinc-700"
                onClick={loadAlunos}
              >
                Alunos
              </TabsTrigger>
            </TabsList>

            {/* Aba Horário */}
            <TabsContent value="horario">
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
              <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
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
            </TabsContent>

            {/* Aba Anotações */}
            <TabsContent value="anotacoes">
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">Data da aula</Label>
                  <Input
                    type="date"
                    value={notaData}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNotaDataChange(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-zinc-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">O que foi abordado</Label>
                  <Textarea
                    value={notaLoading ? '' : notas}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
                    placeholder={notaLoading ? 'Carregando...' : 'Escreva aqui o conteúdo da aula...'}
                    disabled={notaLoading}
                    rows={5}
                    className="bg-zinc-800 border-zinc-700 text-zinc-50 placeholder:text-zinc-600 resize-none"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={handleSaveNota} disabled={isPending || notaLoading}>
                  {isPending ? 'Salvando...' : 'Salvar anotação'}
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Aba Alunos */}
            <TabsContent value="alunos">
              <div className="py-2">
                {!alunosLoaded ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Carregando...</p>
                ) : alunos.length === 0 ? (
                  <p className="text-zinc-500 text-sm text-center py-4">Nenhum aluno matriculado.</p>
                ) : (
                  <ul className="space-y-2">
                    {alunos.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                        <span className="text-zinc-200 text-sm">{a.nome}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          a.status === 'concluido'
                            ? 'bg-purple-900/40 text-purple-400'
                            : 'bg-green-900/40 text-green-400'
                        }`}>
                          {a.status === 'concluido' ? 'Concluído' : 'Ativo'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
