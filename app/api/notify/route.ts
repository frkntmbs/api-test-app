import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const body = await req.json()
    console.log('POST isteği geldi:', body)
    return NextResponse.json(body)
}

export async function GET() {
    return NextResponse.json({ message: 'naber' })
}
