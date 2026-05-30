const nodemailer = require('nodemailer');

export default async function handler(req, res) {
    // Permite CORS (caso o frontend e backend estejam em domínios diferentes durante os testes)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Método não permitido' });
    }

    const { nome, email, servico, barbeiro, data, horario, preco, endereco } = req.body;

    // Configura o "carteiro" usando as variáveis de ambiente da Vercel
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER, // Seu e-mail (configurado na Vercel)
            pass: process.env.EMAIL_PASS  // Sua senha de app (configurada na Vercel)
        }
    });

    const htmlTemplate = `
        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a73e8;">Olá, ${nome}!</h2>
            <p>O seu agendamento na <strong>Yan Barbeiro</strong> foi confirmado com sucesso.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e8eaed;">
                <p style="margin: 5px 0;"><strong>Serviço:</strong> ${servico}</p>
                <p style="margin: 5px 0;"><strong>Profissional:</strong> ${barbeiro}</p>
                <p style="margin: 5px 0;"><strong>Data:</strong> ${data}</p>
                <p style="margin: 5px 0;"><strong>Horário:</strong> ${horario}</p>
                <p style="margin: 5px 0;"><strong>Valor:</strong> R$ ${preco}</p>
                <p style="margin: 5px 0;"><strong>Local:</strong> ${endereco}</p>
            </div>
            
            <p>Agradecemos a preferência e esperamos por você!</p>
            <hr style="border: none; border-top: 1px solid #e8eaed; margin: 20px 0;">
            <small style="color: #888;">Se precisar cancelar ou alterar, por favor entre em contato com a barbearia.</small>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: `"Yan Barbeiro" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Confirmação de Agendamento - Yan Barbeiro ✂️",
            html: htmlTemplate
        });

        res.status(200).json({ message: 'E-mail enviado com sucesso!' });
    } catch (error) {
        console.error("Erro ao enviar e-mail:", error);
        res.status(500).json({ message: 'Erro ao enviar o e-mail', error: error.message });
    }
}