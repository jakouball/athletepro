import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getAdminCoachId } from '@/lib/adminAuth'

const CLIENTS_WITH_GROUPS_SELECT = `
  SELECT c.id, c.name, c.code, c.coach_id, c.created_at,
    COALESCE(
      json_agg(json_build_object('id', tg.id, 'name', tg.name, 'code', tg.code)) FILTER (WHERE tg.id IS NOT NULL),
      '[]'
    ) as training_groups
  FROM clients c
  LEFT JOIN client_training_groups ctg ON ctg.client_id = c.id
  LEFT JOIN training_groups tg ON tg.id = ctg.training_group_id
`

async function setClientTrainingGroups(clientId: string, trainingGroupIds: unknown) {
  if (!Array.isArray(trainingGroupIds)) return

  await query('DELETE FROM client_training_groups WHERE client_id = $1', [clientId])

  for (const groupId of trainingGroupIds) {
    if (!groupId) continue
    await query(
      'INSERT INTO client_training_groups (client_id, training_group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [clientId, groupId]
    )
  }
}

// GET /api/clients - seznam klientů, nebo (s id) detail jednoho klienta
//
// Řazení podle kontextu:
// - ?id=...        -> detail klienta, jen pokud patří přihlášenému trenérovi (admin)
// - admin session   -> seznam klientů přihlášeného trenéra
// - ?coach=<slug>   -> veřejný seznam klientů daného trenéra (klientský login)
// - jinak           -> všichni klienti (zpětná kompatibilita se starými odkazy)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const coachSlug = searchParams.get('coach')
    const adminCoachId = getAdminCoachId(request)

    if (id) {
      if (!adminCoachId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const result = await query(
        `${CLIENTS_WITH_GROUPS_SELECT} WHERE c.id = $1 AND c.coach_id = $2 GROUP BY c.id`,
        [id, adminCoachId]
      )

      return NextResponse.json(result.rows[0] || null)
    }

    if (adminCoachId) {
      const result = await query(
        `${CLIENTS_WITH_GROUPS_SELECT} WHERE c.coach_id = $1 GROUP BY c.id ORDER BY c.name`,
        [adminCoachId]
      )

      return NextResponse.json(result.rows)
    }

    if (coachSlug) {
      const result = await query(
        `${CLIENTS_WITH_GROUPS_SELECT} WHERE c.coach_id = (SELECT id FROM coaches WHERE slug = $1) GROUP BY c.id ORDER BY c.name`,
        [coachSlug]
      )

      return NextResponse.json(result.rows)
    }

    const result = await query(`${CLIENTS_WITH_GROUPS_SELECT} GROUP BY c.id ORDER BY c.name`)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Failed to fetch clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// POST /api/clients - vytvoření nového klienta
export async function POST(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, code, training_group_ids } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedCode = typeof code === 'string' ? code.trim() : ''

    if (!trimmedName || !trimmedCode) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      )
    }

    const result = await query(
      'INSERT INTO clients (name, code, coach_id) VALUES ($1, $2, $3) RETURNING *',
      [trimmedName, trimmedCode, coachId]
    )

    const client = result.rows[0]
    await setClientTrainingGroups(client.id, training_group_ids)

    return NextResponse.json(client, { status: 201 })
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Tento kód už používá jiný klient' }, { status: 409 })
    }

    console.error('Failed to create client:', error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

// PUT /api/clients - úprava jména/kódu/skupin klienta
export async function PUT(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, name, code, training_group_ids } = await request.json()
    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedCode = typeof code === 'string' ? code.trim() : ''

    if (!id || !trimmedName || !trimmedCode) {
      return NextResponse.json(
        { error: 'id, name and code are required' },
        { status: 400 }
      )
    }

    const result = await query(
      'UPDATE clients SET name = $1, code = $2 WHERE id = $3 AND coach_id = $4 RETURNING *',
      [trimmedName, trimmedCode, id, coachId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    await setClientTrainingGroups(id, training_group_ids)

    return NextResponse.json(result.rows[0])
  } catch (error: any) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'Tento kód už používá jiný klient' }, { status: 409 })
    }

    console.error('Failed to update client:', error)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

// DELETE /api/clients - smazání klienta
export async function DELETE(request: NextRequest) {
  try {
    const coachId = getAdminCoachId(request)
    if (!coachId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const result = await query('DELETE FROM clients WHERE id = $1 AND coach_id = $2 RETURNING *', [id, coachId])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete client:', error)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}
