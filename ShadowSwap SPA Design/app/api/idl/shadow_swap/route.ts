import idl from '@/lib/idl/shadow_swap.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(idl)
}

