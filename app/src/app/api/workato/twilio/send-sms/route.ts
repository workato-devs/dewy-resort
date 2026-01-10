import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/workato/twilio/send-sms
 * Mock Workato Twilio integration for sending SMS notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, type } = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: to and message are required' 
        },
        { status: 400 }
      );
    }

    // Validate message type
    const validTypes = ['service_request', 'maintenance', 'checkout'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid message type' 
        },
        { status: 400 }
      );
    }

    // Simulate SMS sending delay (200-500ms)
    const delay = Math.floor(Math.random() * 300) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate mock Twilio message ID
    const messageId = `SM${Date.now()}${Math.random().toString(36).substr(2, 24)}`;

    // Log notification for demo purposes
    console.log('=== Mock Twilio SMS Notification ===');
    console.log(`Message ID: ${messageId}`);
    console.log(`To: ${to}`);
    console.log(`Type: ${type || 'general'}`);
    console.log(`Message: ${message}`);
    console.log(`Sent at: ${new Date().toISOString()}`);
    console.log('===================================');

    // Return success response
    return NextResponse.json({
      success: true,
      messageId,
      to,
      message,
      type: type || 'general',
      sentAt: new Date().toISOString(),
      status: 'sent'
    });
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to send SMS notification' 
      },
      { status: 500 }
    );
  }
}
