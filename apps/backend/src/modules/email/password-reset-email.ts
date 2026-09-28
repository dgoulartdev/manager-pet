import type { EmailMessage } from './email-sender';

interface PasswordResetEmailInput {
  to: string;
  name: string;
  link: string;
  validForMinutes: number;
}

// O nome vem do cadastro: escapa antes de pôr no HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * E-mail de redefinição de senha. HTML com estilos inline e cores fixas, porque
 * leitores de e-mail não carregam CSS nem variáveis (as cores são as do DS).
 */
export function passwordResetEmail({
  to,
  name,
  link,
  validForMinutes,
}: PasswordResetEmailInput): EmailMessage {
  const firstName = name.trim().split(/\s+/)[0] || name;
  const validFor =
    validForMinutes >= 60 ? `${validForMinutes / 60} hora` : `${validForMinutes} minutos`;

  const text = [
    `Olá, ${firstName}.`,
    '',
    'Recebemos um pedido para redefinir a senha da sua conta no MeuPaciente.',
    `Para criar uma senha nova, abra o link abaixo (vale por ${validFor}):`,
    '',
    link,
    '',
    'Se não foi você, ignore este e-mail: sua senha continua a mesma.',
  ].join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px 16px;background:#f7f9fb;font-family:'IBM Plex Sans',Arial,sans-serif;color:#1b222b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d3dae5;border-radius:8px;">
      <tr>
        <td style="padding:32px 28px;">
          <p style="margin:0 0 24px;font-size:15px;font-weight:600;color:#12615c;">MeuPaciente</p>
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:600;">Redefinir sua senha</h1>
          <p style="margin:0 0 12px;font-size:16px;line-height:1.55;">Olá, ${escapeHtml(firstName)}.</p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.55;">Recebemos um pedido para redefinir a senha da sua conta. O link vale por ${validFor}.</p>
          <p style="margin:0 0 24px;">
            <a href="${link}" style="display:inline-block;padding:14px 22px;border-radius:6px;background:#137a72;color:#ffffff;font-size:15px;font-weight:500;text-decoration:none;">Criar senha nova</a>
          </p>
          <p style="margin:0 0 8px;font-size:14px;line-height:1.45;color:#4e5b71;">Se o botão não abrir, copie este endereço no navegador:</p>
          <p style="margin:0 0 24px;font-size:13px;line-height:1.45;word-break:break-all;"><a href="${link}" style="color:#12615c;">${link}</a></p>
          <p style="margin:0;padding-top:16px;border-top:1px solid #e9edf3;font-size:14px;line-height:1.45;color:#4e5b71;">Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to, subject: 'Redefinir sua senha no MeuPaciente', html, text };
}
