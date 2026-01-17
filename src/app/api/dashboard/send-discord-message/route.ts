// app/api/dashboard/send-discord-message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const DISCORD_WEBHOOK_URL_ANN = process.env.DISCORD_WEBHOOK_URL_ANN!;
const JWT_SECRET = process.env.JWT_SECRET!;

function getCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!DISCORD_WEBHOOK_URL_ANN) {
      return NextResponse.json({ error: 'Discord webhook not configured' }, { status: 500 });
    }

    const cookieHeader = request.headers.get('cookie') || '';
    const token = getCookie(cookieHeader, 'auth_token');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Token not found' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const name = decoded.name;
    if (!name) {
      return NextResponse.json({ error: 'Unauthorized: Missing name' }, { status: 401 });
    }

    const body = await request.json();
    const { message, senderName, senderAvatar, embeds } = body;

    if (!embeds || !Array.isArray(embeds) || embeds.length === 0) {
      return NextResponse.json({ error: 'Embed must be provided' }, { status: 400 });
    }

    // Validate embeds
    if (embeds.length > 10) {
      return NextResponse.json({ error: 'Too many embeds (max 10)' }, { status: 400 });
    }

    // Validate each embed
    for (const embed of embeds) {
      if (embed.title && embed.title.length > 256) {
        return NextResponse.json({ error: 'Embed title too long (max 256 characters)' }, { status: 400 });
      }
      if (embed.description && embed.description.length > 2000) {
        return NextResponse.json({ error: 'Embed description too long (max 2000 characters)' }, { status: 400 });
      }
      if (embed.fields && (!Array.isArray(embed.fields) || embed.fields.length > 25)) {
        return NextResponse.json({ error: 'Too many fields (max 25)' }, { status: 400 });
      }
      if (embed.fields) {
        for (const field of embed.fields) {
          if (field.name.length > 256 || field.value.length > 1024) {
            return NextResponse.json({ error: 'Field name or value too long' }, { status: 400 });
          }
        }
      }
      if (embed.thumbnail && embed.thumbnail.url && !isValidUrl(embed.thumbnail.url)) {
        return NextResponse.json({ error: 'Invalid thumbnail URL' }, { status: 400 });
      }
      if (embed.image && embed.image.url && !isValidUrl(embed.image.url)) {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
      }
      if (embed.footer && embed.footer.text && embed.footer.text.length > 2048) {
        return NextResponse.json({ error: 'Footer text too long (max 2048 characters)' }, { status: 400 });
      }
    }

    const webhookPayload = {
      content: message || '',
      username: senderName || 'Dashboard User',
      avatar_url: senderAvatar || undefined,
      embeds: embeds,
    };

    const discordResponse = await fetch(DISCORD_WEBHOOK_URL_ANN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      if (discordResponse.status === 429) {
        return NextResponse.json({ error: 'Rate limited. Please try again later.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Failed to send message to Discord: ' + errorText }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending Discord message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}