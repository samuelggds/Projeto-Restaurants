import { getStoredAccessToken } from '../../modules/auth/session/authSession';
import { connectSocket, waitForSocketConnection } from '../../Services/socketService';

export async function reportEmployeeIssue(payload: { subject: string; message: string }) {
  const token = getStoredAccessToken();
  if (!token) throw new Error('Sessão não encontrada. Entre novamente para relatar o problema.');

  const socket = connectSocket(token, 'operational-help');
  await waitForSocketConnection();

  await new Promise<void>((resolve, reject) => {
    socket.emit(
      'support:chat-send',
      { message: `[${payload.subject}] ${payload.message}` },
      (result: { ok?: boolean; error?: string }) => {
        if (result?.ok) return resolve();
        reject(new Error(result?.error || 'Não foi possível enviar o relato ao administrador.'));
      },
    );
  });
}
