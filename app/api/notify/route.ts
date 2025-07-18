// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PAYU_SECOND_KEY = process.env.PAYU_SECRET_KEY!;
const SIGNATURE_HEADER = 'openpayu-signature';

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text(); // Ham body (önemli)
        const headers = req.headers;

        // Tüm header'ları düz obje haline getir
        const headerObj: Record<string, string> = {};
        headers.forEach((value, key) => {
            headerObj[key] = value;
        });

        // Signature header'ını al
        const signatureHeader = headers.get(SIGNATURE_HEADER);
        const signature = extractSignature(signatureHeader || "");

        const calculatedSignature = crypto
            .createHash('md5')
            .update(rawBody + PAYU_SECOND_KEY)
            .digest('hex');

        const isVerified = signature === calculatedSignature;

        // 🔍 Ham JSON içeriği
        let parsedJSON: unknown = {};
        try {
            parsedJSON = JSON.parse(rawBody);
        } catch (e) {
            console.error("❌ Body JSON parse edilemedi!", e);
        }

        // 💾 Gelişmiş Log
        const fullLog = {
            receivedAt: new Date().toISOString(),
            verified: isVerified,
            signatureHeader,
            signature,
            calculatedSignature,
            headers: headerObj,
            rawBody,
            parsedBody: parsedJSON,
        };

        console.log("📦 PayU Notify Log:\n", JSON.stringify(fullLog, null, 2));

        if (!isVerified) {
            return NextResponse.json({ error: 'Invalid signature', ...fullLog }, { status: 403 });
        }

        return NextResponse.json(
            {
                message: 'PayU Notification Received',
                ...fullLog,
            },
            { status: 200 }
        );
    } catch (err) {
        console.error('💥 Notify error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

function extractSignature(header: string): string | null {
    const match = header.match(/signature=([a-fA-F0-9]+);?/);
    return match ? match[1] : null;
}
