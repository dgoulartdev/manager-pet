import { createTransport } from 'nodemailer';
import type { EmailMessage } from './email-sender';
import { SmtpEmailSender } from './smtp-email-sender';

jest.mock('nodemailer');

const mockedCreateTransport = createTransport as unknown as jest.Mock;

const message: EmailMessage = {
  to: 'ana@example.com',
  subject: 'Crie sua senha nova',
  html: '<p>Oi, Ana</p>',
  text: 'Oi, Ana',
};

const gmail = { host: 'smtp.gmail.com', port: 465, user: 'app@gmail.com', password: 'senha-de-app' };

describe('SmtpEmailSender', () => {
  let sendMail: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail = jest.fn().mockResolvedValue({});
    mockedCreateTransport.mockReturnValue({ sendMail });
  });

  it('autentica com a conta e envia a mensagem com o remetente configurado', async () => {
    const sender = new SmtpEmailSender(gmail, 'MeuPaciente <app@gmail.com>');

    await sender.send(message);

    expect(mockedCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: 'app@gmail.com', pass: 'senha-de-app' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith({
      from: 'MeuPaciente <app@gmail.com>',
      to: 'ana@example.com',
      subject: 'Crie sua senha nova',
      html: '<p>Oi, Ana</p>',
      text: 'Oi, Ana',
    });
  });

  it('fora da porta 465, começa sem TLS (o STARTTLS cuida da criptografia)', () => {
    new SmtpEmailSender({ ...gmail, port: 587 }, 'MeuPaciente <app@gmail.com>');

    expect(mockedCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it('propaga a recusa do servidor, para quem chamou registrar no log', async () => {
    sendMail.mockRejectedValue(new Error('535 Username and Password not accepted'));
    const sender = new SmtpEmailSender(gmail, 'MeuPaciente <app@gmail.com>');

    await expect(sender.send(message)).rejects.toThrow('535');
  });
});
