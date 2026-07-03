const GEMINI_KEY = 'AQ.Ab8RN6JbA7QuWbCnJ3gY2JzDVVZE4V0Bwet9VMW4sY43kON69A';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only intercept /api/scan — everything else serves normally
    if (url.pathname !== '/api/scan') {
      return env.ASSETS.fetch(request);
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { imageData, mimeType } = await request.json();

    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_KEY
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageData } },
              { text: 'Extract the class schedule from this image. Return ONLY a valid JSON array with no markdown or backticks. Each item: {"period":"1","subject":"Math","room":"B204","start":"8:00 AM","end":"8:50 AM"}. Use 12-hour time with AM/PM. If room is missing use "". Return [] if no schedule found.' }
            ]
          }]
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) {
      return new Response(JSON.stringify({ error: data.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const schedule = JSON.parse(clean);

    return new Response(JSON.stringify({ schedule }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
};
