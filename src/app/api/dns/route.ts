import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createForwardEmailDNS } from '@/lib/cloudflare';

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

    // Optionally: Store DNS record ID in profiles table
    // const { error: updateError } = await supabase
    //   .from('profiles')
    //   .update({ dns_record_id: result.record?.id })
    //   .eq('user_id', user.id);

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
