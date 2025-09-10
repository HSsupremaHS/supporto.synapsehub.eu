const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'aooooooooquesto_Dev3essere___-un-secre-lungoeSIcuro',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 ore
  }
}));
app.use((req, res, next) => {
  const sensitivePaths = [
    '/.env', '/.git', '/config.json', 
    '/.DS_Store', '/php-cgi', '/admin'
  ];
  
  if (sensitivePaths.some(path => req.path.includes(path))) {
    return res.status(404).send('Not found');
  }
  next();
});

// Rate limiting per le richieste di supporto
const supportRateLimit = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 1800000, // 30 minuti
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 2, // max 2 richieste
    message: {
        error: 'Troppi tentativi di invio richieste. Riprova tra 30 minuti.',
        retryAfter: 30
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Configurazione email
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Store temporaneo per OTP (in produzione usare Redis)
const otpStore = new Map();

// Routes
app.get('/', (req, res) => {
    res.redirect('/lander');
});

app.get('/lander', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'lander.html'));
});

app.get('/supporto', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'supporto.html'));
});

// API per inviare OTP
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'Email non valida' });
        }

        // Genera OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Salva OTP con scadenza di 10 minuti
        otpStore.set(email, {
            code: otp,
            expires: Date.now() + 600000 // 10 minuti
        });

        // Invia email con OTP
        const mailOptions = {
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: 'Codice di Verifica - Supporto SYNAPSE',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2c3e50; margin: 0;">SYNAPSE</h1>
                            <p style="color: #7f8c8d; margin: 5px 0 0 0;">Platform Support</p>
                        </div>
                        
                        <h2 style="color: #34495e; margin-bottom: 20px;">Codice di Verifica</h2>
                        
                        <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
                            Hai richiesto l'accesso al nostro sistema di supporto. Utilizza il seguente codice per verificare la tua email:
                        </p>
                        
                        <div style="background-color: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: bold; color: #2c3e50; letter-spacing: 5px;">${otp}</span>
                        </div>
                        
                        <p style="color: #e74c3c; font-size: 14px; margin-bottom: 20px;">
                            <strong>Importante:</strong> Questo codice scadrà tra 10 minuti.
                        </p>
                        
                        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #ecf0f1; padding-top: 20px;">
                            Se non hai richiesto questo codice, ignora questa email.<br>
                            Team TrusUs™ - SYNAPSE Platform
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Codice OTP inviato alla tua email' });
        
    } catch (error) {
        console.error('Errore invio OTP:', error);
        res.status(500).json({ error: 'Errore nell\'invio del codice di verifica' });
    }
});

// API per verificare OTP
app.post('/api/verify-otp', (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const storedOtp = otpStore.get(email);
        
        if (!storedOtp) {
            return res.status(400).json({ error: 'Codice OTP non trovato o scaduto' });
        }
        
        if (Date.now() > storedOtp.expires) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'Codice OTP scaduto' });
        }
        
        if (storedOtp.code !== otp) {
            return res.status(400).json({ error: 'Codice OTP non valido' });
        }
        
        // OTP verificato, salva in sessione
        req.session.verifiedEmail = email;
        otpStore.delete(email);
        
        res.json({ success: true, message: 'Email verificata con successo' });
        
    } catch (error) {
        console.error('Errore verifica OTP:', error);
        res.status(500).json({ error: 'Errore nella verifica del codice' });
    }
});

// API per inviare richiesta di supporto
app.post('/api/submit-support', supportRateLimit, async (req, res) => {
    try {
        const { email, title, message } = req.body;
        
        // Verifica che l'email sia stata verificata
        if (!req.session.verifiedEmail || req.session.verifiedEmail !== email) {
            return res.status(401).json({ error: 'Email non verificata' });
        }
        
        if (!title || !message) {
            return res.status(400).json({ error: 'Titolo e messaggio sono obbligatori' });
        }

        // Invia al webhook Discord
        const discordPayload = {
            embeds: [{
                title: '🎫 Nuova Richiesta di Supporto',
                color: 0x3498db,
                fields: [
                    {
                        name: '📧 Email',
                        value: email,
                        inline: true
                    },
                    {
                        name: '📝 Titolo',
                        value: title,
                        inline: true
                    },
                    {
                        name: '💬 Messaggio',
                        value: message.length > 1000 ? message.substring(0, 1000) + '...' : message,
                        inline: false
                    }
                ],
                timestamp: new Date().toISOString(),
                footer: {
                    text: 'SYNAPSE Support Portal'
                }
            }]
        };

        await axios.post(process.env.DISCORD_WEBHOOK_URL, discordPayload);

        // Invia email di conferma
        const confirmationEmail = {
            from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
            to: email,
            subject: 'Richiesta di Supporto Ricevuta - SYNAPSE',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
                    <div style="background-color: #ffffff; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #2c3e50; margin: 0;">SYNAPSE</h1>
                            <p style="color: #7f8c8d; margin: 5px 0 0 0;">Platform Support</p>
                        </div>
                        
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h2 style="color: #155724; margin: 0 0 10px 0;">✅ Richiesta Ricevuta</h2>
                            <p style="color: #155724; margin: 0;">La tua richiesta di supporto è stata inviata con successo!</p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h3 style="color: #495057; margin: 0 0 15px 0;">Dettagli della Richiesta:</h3>
                            <p style="margin: 5px 0;"><strong>Titolo:</strong> ${title}</p>
                            <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                            <p style="margin: 5px 0;"><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
                        </div>
                        
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h3 style="color: #856404; margin: 0 0 10px 0;">📧 Prossimi Passi</h3>
                            <p style="color: #856404; margin: 0; line-height: 1.6;">
                                Il nostro team TrusUs™ esaminerà la tua richiesta e ti risponderà all'indirizzo email <strong>${email}</strong> il prima possibile.
                            </p>
                        </div>
                        
                        <p style="color: #6c757d; font-size: 14px; line-height: 1.6;">
                            Grazie per aver contattato il supporto SYNAPSE. Il nostro team di esperti è qui per aiutarti a risolvere qualsiasi problema o domanda tu possa avere.
                        </p>
                        
                        <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px; border-top: 1px solid #ecf0f1; padding-top: 20px;">
                            Team TrusUs™ - SYNAPSE Platform<br>
                            Questo è un messaggio automatico, non rispondere a questa email.
                        </p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(confirmationEmail);
        
        // Pulisci la sessione
        req.session.verifiedEmail = null;
        
        res.json({ success: true, message: 'Richiesta di supporto inviata con successo' });
        
    } catch (error) {
        console.error('Errore invio richiesta:', error);
        res.status(500).json({ error: 'Errore nell\'invio della richiesta di supporto' });
    }
});

// API per chat AI con DeepSeek
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory = [] } = req.body;
        
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'Messaggio non può essere vuoto' });
        }

        // Prompt di sistema per addestrare l'AI come assistente SYNAPSE
        const systemPrompt = `Sei un assistente AI specializzato per la piattaforma synapse. 

Caratteristiche della tua personalità:
- Professionale ma amichevole
- Esperto in tecnologie web, sviluppo software e supporto tecnico
- Sempre disponibile ad aiutare con problemi tecnici
- Conosci bene la piattaforma SYNAPSE e i suoi servizi
- Rispondi in italiano in modo chiaro e conciso
- Se non conosci una risposta specifica, ammettilo onestamente

Il tuo ruolo è assistere gli utenti con:
- Domande tecniche sulla piattaforma SYNAPSE
- Risoluzione di problemi
- Spiegazioni di funzionalità
- Supporto generale

synapse è una piattaforma multiuso;
offriamo: hosting per siti web, api key, bot, file, vps, cloud  e altri
a partire da 2,90€

offriamo assistenza tramite il team TrustUs™ un team di assistenza che risponde ad ogni domanda, offre supporto e gestisce le richieste (email di contatto: supporto@synapsehub.eu)
offriamo altri servizi:
ads manager, con statistiche, dashboard e altro tutto gratis, su click.synapsehub.eu
synapse Elite™, un'abbonamento di 12€ /mese con queste caratteristiche:
:: Synapse Elite™

Cos'hanno di così speciale gli utenti premium?

:: Servizi dedicati 

:: Sconti esclusivi 

:: Assistenza Prioritaria

E in futuro molto altro!




AntiScam™, un servizio a cura del team TrustUs™, che offre queste caratteristiche:
:: Synapse AntiScam™

Proteggiti da siti web pericolosi, utenti malintenzionati, su discord e altrove, proteggi i tuoi dati, la tua privacy, blocca email di utenti segnalati e gestisci in maniera pulita i tuoi dati

::  Proteggiti dal web - grazie a proxy-tor che offuscano i tuoi dati, blocco automatico di siti segnalati e contrassegnati come pericolosi

::  Proteggiti da utenti pericolosi - utenti di ogni social, X (twitter), Youtube, Discord, Tiktok, Instagram e molti altri, 

:: Accedi a consigli per migliorare la tua sicurezza - con il nostro team TrustUs™ potrai ricevere consigli e assistenza immediata

:: Accedi ad una dashboard personalizzata - pronta all'uso, facile da utilizzare. Conserva tutti i tuoi dati in un posto sicuro e verificato

:: Ottieni crediti e sconti esclusivi - per ogni utente segnalato Synapse® ti  assegnerà crediti e sconti esclusivi utilizzabili con il tuo account

Mantieni sempre un tono professionale e utile.`;

        // Prepara i messaggi per l'API DeepSeek
        const messages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        // Chiamata all'API DeepSeek
        const response = await axios.post(process.env.DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: messages,
            max_tokens: 1000,
            temperature: 0.7,
            stream: false
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const aiResponse = response.data.choices[0].message.content;
        
        res.json({ 
            success: true, 
            response: aiResponse,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Errore chat AI:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            res.status(500).json({ error: 'Errore di autenticazione con il servizio AI' });
        } else if (error.response?.status === 429) {
            res.status(429).json({ error: 'Troppi messaggi. Riprova tra qualche secondo.' });
        } else {
            res.status(500).json({ error: 'Errore nel servizio di chat AI. Riprova più tardi.' });
        }
    }
});

// Avvio server
app.listen(PORT, () => {
    console.log(`🚀 Server SYNAPSE Support Portal avviato su http://localhost:${PORT}`);
    console.log(`📧 Email service configurato: ${process.env.EMAIL_HOST}`);
    console.log(`🔒 Rate limiting attivo: ${process.env.RATE_LIMIT_MAX_REQUESTS} richieste ogni ${process.env.RATE_LIMIT_WINDOW_MS/60000} minuti`);
});

module.exports = app;