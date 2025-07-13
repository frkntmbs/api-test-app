// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface PayUNotification {
    order: {
        orderId: string;
        extOrderId: string;
        orderCreateDate: string;
        notifyUrl: string;
        customerIp: string;
        merchantPosId: string;
        description: string;
        currencyCode: string;
        totalAmount: string;
        status: string;
        products: Array<{
            name: string;
            unitPrice: string;
            quantity: string;
        }>;
    };
    properties: Array<{
        name: string;
        value: string;
    }>;
}

export async function POST(req: NextRequest) {
    try {
        const notification: PayUNotification = await req.json();
        console.log('PayU Notification Received:', JSON.stringify(notification, null, 2));

        // 1. Temel bilgileri al
        const { orderId, extOrderId, status, totalAmount, currencyCode } = notification.order;
        const amount = parseInt(totalAmount) / 100; // PayU amount'u 100 ile çarpılmış olarak gönderir

        // 2. HASH doğrulama (eğer varsa)
        //const paymentId = notification.properties.find(p => p.name === 'PAYMENT_ID')?.value;
        const receivedHash = notification.properties.find(p => p.name === 'HASH')?.value;

        if (process.env.PAYU_SECRET_KEY && receivedHash) {
            const expectedHash = crypto
                .createHash('sha256')
                .update(`${orderId}${status}${process.env.PAYU_SECRET_KEY}`)
                .digest('hex');

            if (receivedHash !== expectedHash) {
                console.error('HASH doğrulama başarısız!');
                return NextResponse.json(
                    { error: 'Unauthorized: Invalid hash' },
                    { status: 403 }
                );
            }
        }

        // 3. Ödeme durumuna göre işlem yap
        switch (status) {
            case 'COMPLETED':
                console.log(`✅ Ödeme tamamlandı - Sipariş: ${extOrderId}, Tutar: ${amount} ${currencyCode}`);
                // Veritabanı güncelleme veya sipariş onaylama işlemleri burada yapılacak
                break;

            case 'WAITING_FOR_CONFIRMATION':
                console.log(`🟡 Ödeme bekleniyor - Sipariş: ${extOrderId}`);
                break;

            case 'CANCELED':
                console.log(`❌ Ödeme iptal edildi - Sipariş: ${extOrderId}`);
                break;

            default:
                console.log(`ℹ️ Bilinmeyen durum: ${status} - Sipariş: ${extOrderId}`);
        }

        // 4. PayU'ya başarı yanıtı gönder (MUTLAKA 200 dönün)
        return NextResponse.json(
            {
                status: 'OK',
                orderId,
                extOrderId,
                paymentStatus: status,
                verified: !!receivedHash
            },
            { status: 200 }
        );

    } catch (error) {
        console.error('Notification Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json(
        {
            message: 'Bu endpoint PayU notify URL için hazırlandı',
            usage: 'POST isteklerini kabul eder',
            example: {
                order: {
                    orderId: 'TEST123',
                    status: 'COMPLETED'
                },
                properties: [
                    { name: 'PAYMENT_ID', value: '12345' }
                ]
            }
        },
        { status: 200 }
    );
}