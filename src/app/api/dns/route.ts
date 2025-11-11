import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createForwardEmailDNS, updateForwardEmailDNS, listForwardEmailDNS } from '@/lib/cloudflare';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { alias, forwardTo } = body;

    if (!alias || typeof alias !== 'string') {
      return NextResponse.json(
        { error: 'Invalid alias provided' },
        { status: 400 }
      );
    }

    // Create DNS record via Cloudflare API
    const result = await createForwardEmailDNS(alias, forwardTo);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create DNS record' },
        { status: 500 }
      );
    }

    // Store DNS record ID in profiles table for future updates
    if (result.record?.id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ dns_record_id: result.record.id })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to store dns_record_id:', updateError);
        // Don't fail the request, DNS was created successfully
      }
    }

    return NextResponse.json({
      success: true,
      record: result.record,
      message: 'DNS record created successfully',
    });
  } catch (error) {
    console.error('Error in DNS API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update existing DNS record
export async function PATCH(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile with dns_record_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('alias, dns_record_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { forwardTo } = body;

    // If no dns_record_id, try to find it
    let recordId = profile.dns_record_id;
    
    if (!recordId) {
      console.log('No dns_record_id stored, searching for existing record...');
      const listResult = await listForwardEmailDNS();
      
      if (listResult.success && listResult.records) {
        const existingRecord = listResult.records.find(
          (record) => record.content.includes(`forward-email=${profile.alias}:`)
        );
        
        if (existingRecord?.id) {
          recordId = existingRecord.id;
          // Store it for future use
          await supabase
            .from('profiles')
            .update({ dns_record_id: recordId })
            .eq('user_id', user.id);
        }
      }
    }

    if (!recordId) {
      return NextResponse.json(
        { error: 'No DNS record found. Please contact administrator.' },
        { status: 404 }
      );
    }

    // Update DNS record via Cloudflare API
    const result = await updateForwardEmailDNS(recordId, profile.alias, forwardTo);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update DNS record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: forwardTo 
        ? 'DNS record updated with forwarding address' 
        : 'DNS record updated (forwarding removed)',
    });
  } catch (error) {
    console.error('Error in DNS PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
