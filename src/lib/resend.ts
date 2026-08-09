import { Resend } from 'resend';

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not set');
    _resend = new Resend(key);
  }
  return _resend;
}

// Template para email de reset de senha
export async function sendPasswordResetEmail(to: string, resetUrl: string, _userName?: string) {
    try {
        await getResend().emails.send({
            from: 'Jupter <noreply@jupter.app>',
            to,
            subject: 'Redefinir senha - Jupter',
            html: `
                <div style="background-color: #f8f9fb; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; color: #1a1a1a;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                        <!-- Logo simplificado -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <div style="display: inline-block; font-size: 28px; font-weight: 800; color: #10B981;">Jupter</div>
                        </div>
                        
                        <h1 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Redefinir sua senha</h1>
                        
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha para sua conta.</p>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center">
                                    <a href="${resetUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Redefinir senha</a>
                                </td>
                            </tr>
                        </table>
                        <p style="margin-top: 24px; font-size: 14px; color: #4B5563; text-align: center;">Por segurança, este link expira em 24 horas. Se você não solicitou a redefinição de senha, por favor ignore este email e verifique a segurança da sua conta.</p>
                        <div style="margin-top: 24px; padding: 16px; background-color: rgba(16, 185, 129, 0.1); border-radius: 6px;">
                            <p style="color: #065F46; font-size: 14px; margin: 0; text-align: center;">Dica de segurança: Escolha uma senha forte que você não usa em outros sites.</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 32px; font-size: 14px; color: #6B7280;">
                        <p style="margin: 0;">Jupter - Sua plataforma de finanças</p>
                        <div style="width: 40px; height: 4px; background-color: #10B981; margin: 12px auto 0;"></div>
                    </div>
                </div>
            `,
        });
        console.log('✅ Email de reset de senha enviado para:', to);
    } catch (error) {
        console.error('❌ Erro ao enviar email de reset de senha:', error);
        throw error;
    }
}

// Template para email de verificação
export async function sendVerificationEmail(to: string, verificationUrl: string, _userName?: string) {
    try {
        await getResend().emails.send({
            from: 'Jupter <noreply@jupter.app>',
            to,
            subject: 'Verificar email - Jupter',
            html: `
                <div style="background-color: #f8f9fb; font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; color: #1a1a1a;">
                    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
                        <!-- Logo simplificado -->
                        <div style="text-align: center; margin-bottom: 32px;">
                            <div style="display: inline-block; font-size: 28px; font-weight: 800; color: #10B981;">Jupter</div>
                        </div>
                        
                        <h1 style="color: #111827; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">Confirme sua conta</h1>
                        
                        <p style="color: #4B5563; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0; text-align: center;">Bem vindo! Para começar a usar a Jupter, confirme seu email clicando no botão abaixo.</p>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                            <tr>
                                <td align="center">
                                    <a href="${verificationUrl}" style="display: inline-block; background-color: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Confirmar conta</a>
                                </td>
                            </tr>
                        </table>
                        <p style="margin-top: 24px; font-size: 14px; color: #4B5563; text-align: center;">Por segurança, este link expira em 24 horas. Se você não solicitou esta confirmação, por favor ignore este email.</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 32px; font-size: 14px; color: #6B7280;">
                        <p style="margin: 0;">Jupter - Sua plataforma de finanças</p>
                        <div style="width: 40px; height: 4px; background-color: #10B981; margin: 12px auto 0;"></div>
                    </div>
                </div>
            `,
        });
        console.log('✅ Email de verificação enviado para:', to);
    } catch (error) {
        console.error('❌ Erro ao enviar email de verificação:', error);
        throw error;
    }
}

