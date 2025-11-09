import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET endpoint to monitor recent webhook deliveries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Fetch recent incoming emails as webhook logs
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('type', 'incoming')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch webhook logs', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Recent webhook deliveries (incoming emails)',
        count: data.length,
        webhooks: data.map(email => ({
          id: email.id,
          from: email.from_email,
          to: email.to_email,
          subject: email.subject,
          received_at: email.received_at || email.created_at,
          body_preview: email.body?.substring(0, 100) + '...',
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Webhook logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Log the raw request for debugging
    const rawBody = await request.text();
    console.log('📨 Webhook received:', {
      headers: Object.fromEntries(request.headers.entries()),
      body: rawBody.substring(0, 500), // Log first 500 chars
    });

    // Parse the body
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // ForwardEmail sends a specific format based on their docs
    console.log('📧 Parsed email data:', JSON.stringify(body, null, 2));

    // Extract email fields from ForwardEmail's format
    // ForwardEmail sends: { from: { value: [{ address, name }], text }, recipients: [...], text, html, ... }
    let fromEmail = 'unknown@example.com';
    
    if (body.from?.value && Array.isArray(body.from.value) && body.from.value.length > 0) {
      fromEmail = body.from.value[0].address || fromEmail;
    } else if (body.from?.text) {
      fromEmail = body.from.text;
    } else if (typeof body.from === 'string') {
      fromEmail = body.from;
    } else if (body.session?.sender) {
      fromEmail = body.session.sender;
    }

    // Get recipient from recipients array or session
    let toEmail = 'alias@fisica.cat';
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      toEmail = body.recipients[0];
    } else if (body.session?.recipient) {
      toEmail = body.session.recipient;
    } else if (body.to) {
      toEmail = typeof body.to === 'string' ? body.to : body.to.text || body.to.value?.[0]?.address;
    }

    const subject = body.subject || '(No Subject)';
    const text = body.text || body.textAsHtml || '';
    const html = body.html || body.textAsHtml || '';
    const attachments = body.attachments || [];

    // Log extracted fields for debugging
    console.log('📋 Extracted fields:', { fromEmail, toEmail, subject, hasText: !!text, hasHtml: !!html });

    // Validate required fields
    if (!fromEmail || !toEmail) {
      console.error('Missing required fields:', { fromEmail, toEmail });
      return NextResponse.json(
        { 
          error: 'Missing required fields: from or to',
          received: { fromEmail, toEmail, subject },
          hint: 'Check ForwardEmail webhook documentation for correct field names'
        },
        { status: 400 }
      );
    }

    // Store the email in Supabase
    const { data, error } = await supabase
      .from('emails')
      .insert({
        from_email: fromEmail,
        to_email: toEmail,
        subject: subject,
        body: text,
        html_body: html,
        received_at: new Date().toISOString(),
        type: 'incoming',
        is_read: false,
        message_id: body.messageId || body.message_id || null,
        attachments: attachments.map((att: { filename?: string; name?: string; contentType?: string; type?: string; size?: number }) => ({
          filename: att.filename || att.name || 'unknown',
          content_type: att.contentType || att.type || 'application/octet-stream',
          size: att.size || 0,
        })),
        metadata: {
          raw_webhook: body, // Store the complete webhook data for debugging
          received_timestamp: new Date().toISOString(),
        }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to store email', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Email stored successfully:', data.id);
    
    return NextResponse.json(
      { 
        success: true, 
        email_id: data.id,
        message: 'Email received and stored successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
