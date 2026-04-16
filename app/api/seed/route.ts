import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Rota temporária para criar usuários de teste.
// Requer SUPABASE_SERVICE_ROLE_KEY no .env.local
export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          'Adicione SUPABASE_SERVICE_ROLE_KEY ao .env.local. ' +
          'Encontre em: Supabase Dashboard → Project Settings → API → service_role',
      },
      { status: 500 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const users = [
    {
      email: 'admin@admin.com',
      password: '123456',
      user_metadata: { perfil: 'diretor', nome: 'Administrador' },
    },
    {
      email: 'aluno@aluno.com',
      password: '123456',
      user_metadata: { perfil: 'aluno', nome: 'Aluno Teste' },
    },
  ]

  const results = []

  for (const u of users) {
    // Tenta buscar usuário existente pelo email
    const { data: list } = await supabase.auth.admin.listUsers()
    const existing = list?.users?.find((x) => x.email === u.email)

    if (existing) {
      // Atualiza senha e metadata se já existe
      const { data, error } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password: u.password,
          user_metadata: u.user_metadata,
          email_confirm: true,
        }
      )
      results.push({
        email: u.email,
        action: 'updated',
        id: data.user?.id ?? null,
        error: error?.message ?? null,
      })
    } else {
      // Cria novo usuário confirmado
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        user_metadata: u.user_metadata,
        email_confirm: true,
      })
      results.push({
        email: u.email,
        action: 'created',
        id: data.user?.id ?? null,
        error: error?.message ?? null,
      })
    }
  }

  return NextResponse.json({ results })
}
