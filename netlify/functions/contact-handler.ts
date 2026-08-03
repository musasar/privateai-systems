import { Handler } from '@netlify/functions';

interface FormData {
  full_name: string;
  company: string;
  country: string;
  email: string;
  phone: string;
  message: string;
  'form-name': string;
  'bot-field'?: string;
}

const formatPhoneForWhatsApp = (phone: string, country: string): string => {
  const countryCodes: Record<string, string> = {
    germany: '+49', germany: '+49', de: '+49', deutschland: '+49',
    netherlands: '+31', nl: '+31', holland: '+31',
    sweden: '+46', se: '+46', sverige: '+46',
    france: '+33', fr: '+33',
    italy: '+39', it: '+39', italia: '+39',
    spain: '+34', es: '+34', espana: '+34',
    austria: '+43', at: '+43', osterreich: '+43',
    belgium: '+32', be: '+32',
    switzerland: '+41', ch: '+41', schweiz: '+41',
    denmark: '+45', dk: '+45',
    finland: '+358', fi: '+358',
    norway: '+47', no: '+47',
    poland: '+48', pl: '+48',
    czech: '+420', cz: '+420',
    ireland: '+353', ie: '+353',
    portugal: '+351', pt: '+351',
    united kingdom: '+44', uk: '+44', gb: '+44', britain: '+44',
    turkey: '+90', tr: '+90', turkiye: '+90',
    usa: '+1', us: '+1', america: '+1',
    canada: '+1', ca: '+1',
  };

  const normalized = phone.replace(/\D/g, '');
  const countryLower = country.toLowerCase().trim();
  const code = countryCodes[countryLower] || '+49';
  
  if (normalized.startsWith(code.replace('+', ''))) {
    return code + normalized.slice(code.length - 1);
  }
  if (normalized.startsWith('0')) {
    return code + normalized.slice(1);
  }
  return code + normalized;
};

const sendWhatsApp = async (message: string): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:18789/api/v1/message/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+905525400206',
        message,
      }),
    });
    return response.ok;
  } catch (e) {
    console.error('WhatsApp send failed:', e);
    return false;
  }
};

const sendEmail = async (data: FormData): Promise<boolean> => {
  try {
    const response = await fetch('https://api.netlify.com/api/v1/forms/contact/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NETLIFY_AUTH_TOKEN}`,
      },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (e) {
    console.error('Email send failed:', e);
    return false;
  }
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const formData: FormData = JSON.parse(event.body || '{}');
    
    if (formData['bot-field']) {
      return { statusCode: 200, body: 'OK' };
    }

    const whatsappPhone = formatPhoneForWhatsApp(formData.phone || '', formData.country);
    
    const whatsappMessage = `🔔 *New PrivateAI Consultation Request*

👤 *Name:* ${formData.full_name}
🏢 *Company:* ${formData.company}
🌍 *Country:* ${formData.country}
📧 *Email:* ${formData.email}
📱 *Phone:* ${whatsappPhone}

💬 *Message:*
${formData.message}

---
🔗 Reply via WhatsApp or email.`;

    const [emailSent, whatsappSent] = await Promise.all([
      sendEmail(formData),
      sendWhatsApp(whatsappMessage),
    ]);

    console.log(`Email: ${emailSent}, WhatsApp: ${whatsappSent}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, email: emailSent, whatsapp: whatsappSent }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: 'Internal Server Error' };
  }
};